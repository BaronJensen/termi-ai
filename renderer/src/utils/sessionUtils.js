/**
 * Utility functions for session management and JSON parsing
 */

/**
 * Extracts session_id from a JSON string
 * @param {string} jsonLine - The JSON string to parse
 * @param {Object} options - Optional configuration
 * @param {boolean} options.logging - Whether to enable detailed logging (default: true)
 * @param {boolean} options.validateCompleteness - Whether to check if JSON appears complete (default: true)
 * @returns {string|null} - The extracted session_id or null if not found/parseable
 * 
 * @example
 * // Basic usage
 * const sessionId = extractSessionIdFromJson('{"type":"session_start","session_id":"abc123"}');
 * // Returns: "abc123"
 * 
 * // With options
 * const sessionId = extractSessionIdFromJson(jsonLine, { logging: false, validateCompleteness: false });
 * 
 * // Handle incomplete JSON
 * const sessionId = extractSessionIdFromJson('{"type":"session_start","session_id":"abc123"');
 * // Returns: null (and logs warning about incomplete JSON)
 */
export const extractSessionIdFromJson = (jsonLine, options = {}) => {
  const { logging = true, validateCompleteness = true } = options;
  
  if (!jsonLine || typeof jsonLine !== 'string') {
    if (logging) {
      console.log('🔍 extractSessionIdFromJson: Invalid input, expected non-empty string');
    }
    return null;
  }
  
  if (logging) {
    console.log(`🔍 extractSessionIdFromJson: Attempting to extract session_id from JSON line:`, jsonLine);
  }
  
  // Check if the JSON line appears to be complete (starts with { and ends with })
  if (validateCompleteness) {
    const trimmedLine = jsonLine.trim();
    const isCompleteJson = trimmedLine.startsWith('{') && trimmedLine.endsWith('}');
    
    if (!isCompleteJson) {
      if (logging) {
        console.log(`🔍 extractSessionIdFromJson: JSON line appears incomplete, may need buffering:`, trimmedLine);
      }
    }
  }
  
  try {
    const parsed = JSON.parse(jsonLine);
    if (parsed.session_id) {
      if (logging) {
        console.log(`🔍 extractSessionIdFromJson: Successfully extracted session_id: ${parsed.session_id}`);
      }
      return parsed.session_id;
    } else {
      if (logging) {
        console.log(`🔍 extractSessionIdFromJson: JSON parsed but no session_id found:`, parsed);
      }
      return null;
    }
  } catch (error) {
    if (logging) {
      console.warn('extractSessionIdFromJson: Failed to parse JSON line for session_id extraction:', error);
      console.warn('extractSessionIdFromJson: Raw line content:', jsonLine);
      
      // If this looks like it might be a partial JSON message, log it for debugging
      const trimmedLine = jsonLine.trim();
      if (trimmedLine.startsWith('{') && !trimmedLine.endsWith('}')) {
        console.log(`🔍 extractSessionIdFromJson: This appears to be a partial JSON message that may need buffering`);
      }
    }
    return null;
  }
};

/**
 * Checks if a JSON string appears to be complete
 * @param {string} jsonLine - The JSON string to check
 * @returns {boolean} - True if the JSON appears complete
 * 
 * @example
 * isCompleteJson('{"key":"value"}') // Returns: true
 * isCompleteJson('{"key":"value"') // Returns: false
 * isCompleteJson('{"key":"value"} extra') // Returns: false
 */
export const isCompleteJson = (jsonLine) => {
  if (!jsonLine || typeof jsonLine !== 'string') {
    return false;
  }
  
  const trimmedLine = jsonLine.trim();
  return trimmedLine.startsWith('{') && trimmedLine.endsWith('}');
};

/**
 * Safely parses JSON with error handling
 * @param {string} jsonString - The JSON string to parse
 * @param {any} fallback - Value to return if parsing fails (default: null)
 * @returns {any} - The parsed JSON object or fallback value
 * 
 * @example
 * safeJsonParse('{"key":"value"}') // Returns: { key: "value" }
 * safeJsonParse('invalid json') // Returns: null
 * safeJsonParse('invalid json', {}) // Returns: {}
 */
export const safeJsonParse = (jsonString, fallback = null) => {
  if (!jsonString || typeof jsonString !== 'string') {
    return fallback;
  }
  
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    return fallback;
  }
};

/**
 * Parses a cursor log payload and extracts the message content
 * @param {Object} payload - The raw cursor log payload
 * @param {Object} options - Optional configuration
 * @returns {Object|null} - Parsed message object or null if not parseable
 * 
 * @example
 * const message = parseCursorLogPayload({
 *   level: 'json',
 *   line: '{"type":"session_start","session_id":"abc123"}',
 *   runId: 'run-123',
 *   id: 'session-456'
 * });
 * // Returns: { type: "session_start", session_id: "abc123" }
 */
export const parseCursorLogPayload = (payload, options = {}) => {
  const { logging = true } = options;
  
  if (!payload || typeof payload !== 'object') {
    if (logging) {
      console.log('🔍 parseCursorLogPayload: Invalid payload, expected object');
    }
    return null;
  }
  
  // Only parse JSON level messages
  if (payload.level !== 'json') {
    if (logging) {
      console.log(`🔍 parseCursorLogPayload: Skipping non-JSON message (level: ${payload.level})`);
    }
    return null;
  }
  
  if (!payload.line || typeof payload.line !== 'string') {
    if (logging) {
      console.log('🔍 parseCursorLogPayload: No line content to parse');
    }
    return null;
  }
  
  try {
    const parsed = JSON.parse(payload.line);
    if (logging) {
      console.log(`🔍 parseCursorLogPayload: Successfully parsed message:`, {
        type: parsed.type,
        hasSessionId: !!parsed.session_id,
        hasMessage: !!parsed.message
      });
    }
    return parsed;
  } catch (error) {
    if (logging) {
      console.warn('parseCursorLogPayload: Failed to parse JSON line:', error);
      console.warn('parseCursorLogPayload: Raw line content:', payload.line);
    }
    return null;
  }
};

/**
 * Extracts multiple fields from a JSON string
 * @param {string} jsonLine - The JSON string to parse
 * @param {string[]} fields - Array of field names to extract
 * @param {Object} options - Optional configuration
 * @returns {Object} - Object with extracted fields, null for missing fields
 * 
 * @example
 * const result = extractFieldsFromJson('{"type":"session_start","session_id":"abc123","message":"hello"}', ['type', 'session_id']);
 * // Returns: { type: "session_start", session_id: "abc123" }
 */
export const extractFieldsFromJson = (jsonLine, fields, options = {}) => {
  const { logging = true } = options;
  
  if (!jsonLine || !Array.isArray(fields) || fields.length === 0) {
    return {};
  }
  
  try {
    const parsed = JSON.parse(jsonLine);
    const result = {};
    
    fields.forEach(field => {
      if (parsed.hasOwnProperty(field)) {
        result[field] = parsed[field];
      } else {
        result[field] = null;
      }
    });
    
    if (logging) {
      console.log(`🔍 extractFieldsFromJson: Extracted fields:`, result);
    }
    
    return result;
  } catch (error) {
    if (logging) {
      console.warn('extractFieldsFromJson: Failed to parse JSON:', error);
    }
    return {};
  }
};
