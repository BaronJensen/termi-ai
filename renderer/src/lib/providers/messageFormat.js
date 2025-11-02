/**
 * Unified Message Format
 *
 * All provider-specific parsers transform their native formats into this unified structure.
 * This allows the UI to render messages consistently regardless of the AI provider.
 */

/**
 * Message types for unified format
 */
export const MessageType = {
  // System messages
  SYSTEM: 'system',
  STATUS: 'status',
  ERROR: 'error',

  // Assistant messages
  ASSISTANT: 'assistant',
  REASONING: 'reasoning',
  RESULT: 'result',

  // Tool execution
  TOOL_CALL: 'tool_call',
  TOOL_OUTPUT: 'tool_output',
  TOOL_RESULT: 'tool_result',

  // File operations
  FILE_EDIT: 'file_edit',
  DIFF: 'diff',

  // Streaming
  STREAMING_START: 'streaming_start',
  STREAMING_DELTA: 'streaming_delta',
  STREAMING_END: 'streaming_end',

  // Session management
  SESSION_START: 'session_start',
  SESSION_END: 'session_end',

  // Metadata
  METADATA: 'metadata',
  CONFIG: 'config',

  // User
  USER_PROMPT: 'user_prompt',

  // Other
  UNKNOWN: 'unknown'
};

/**
 * Unified message structure
 *
 * @typedef {Object} UnifiedMessage
 * @property {string} type - Message type from MessageType enum
 * @property {string} provider - Provider name ('cursor', 'claude', 'codex')
 * @property {number} timestamp - Unix timestamp in milliseconds
 * @property {Object} data - Type-specific data
 * @property {Object} metadata - Additional metadata
 * @property {Object} raw - Original raw message from provider
 */

/**
 * Type-specific data structures
 */

/**
 * @typedef {Object} SystemMessageData
 * @property {string} text - System message text
 * @property {string} [subtype] - System message subtype (e.g., 'init')
 * @property {string} [sessionId] - Session ID if available
 */

/**
 * @typedef {Object} AssistantMessageData
 * @property {string} text - Assistant message text
 * @property {string} [model] - Model used
 * @property {boolean} [isStreaming] - Whether this is streaming content
 * @property {boolean} [isFinal] - Whether this is the final message
 */

/**
 * @typedef {Object} ReasoningMessageData
 * @property {string} text - Reasoning text
 * @property {boolean} [isTemporary] - Whether this should be cleared later
 */

/**
 * @typedef {Object} ResultMessageData
 * @property {string} text - Result text
 * @property {boolean} [success] - Whether operation succeeded
 * @property {number} [durationMs] - Duration in milliseconds
 * @property {number} [costUsd] - Cost in USD
 */

/**
 * @typedef {Object} ToolCallMessageData
 * @property {string} id - Tool call ID
 * @property {string} name - Tool name
 * @property {Object} args - Tool arguments
 * @property {string} [status] - Tool call status ('started', 'running', 'completed')
 */

/**
 * @typedef {Object} ToolOutputMessageData
 * @property {string} id - Tool call ID
 * @property {string} text - Output text
 * @property {string} [stream] - Stream type ('stdout', 'stderr')
 */

/**
 * @typedef {Object} ToolResultMessageData
 * @property {string} id - Tool call ID
 * @property {string} [stdout] - Standard output
 * @property {string} [stderr] - Standard error
 * @property {number} [exitCode] - Exit code
 * @property {boolean} [success] - Whether tool execution succeeded
 */

/**
 * @typedef {Object} FileEditMessageData
 * @property {string} [path] - File path
 * @property {boolean} [success] - Whether edit succeeded
 * @property {string} [stdout] - Standard output
 * @property {string} [stderr] - Standard error
 * @property {Object} [changes] - Changes made
 */

/**
 * @typedef {Object} DiffMessageData
 * @property {string} text - Diff text
 * @property {string} [format] - Diff format ('unified', 'patch')
 */

/**
 * @typedef {Object} StreamingDeltaMessageData
 * @property {string} text - Delta text to append
 * @property {number} [index] - Stream index
 */

/**
 * @typedef {Object} MetadataMessageData
 * @property {Object} [tokens] - Token usage information
 * @property {number} [tokens.input] - Input tokens
 * @property {number} [tokens.output] - Output tokens
 * @property {number} [tokens.total] - Total tokens
 */

/**
 * Create a unified message
 *
 * @param {string} type - Message type from MessageType
 * @param {string} provider - Provider name
 * @param {Object} data - Type-specific data
 * @param {Object} metadata - Additional metadata
 * @param {Object} raw - Original raw message
 * @returns {UnifiedMessage}
 */
export function createUnifiedMessage(type, provider, data, metadata = {}, raw = null) {
  return {
    type,
    provider,
    timestamp: Date.now(),
    data,
    metadata,
    raw
  };
}

/**
 * Check if a message should be displayed in the UI
 *
 * @param {UnifiedMessage} message
 * @returns {boolean}
 */
export function shouldDisplayMessage(message) {
  // Hidden message types
  const hiddenTypes = [
    MessageType.CONFIG,
    MessageType.STREAMING_START,
    MessageType.STREAMING_END,
    MessageType.SESSION_START, // Hide session lifecycle messages
    MessageType.SESSION_END,   // Hide session lifecycle messages
    MessageType.DIFF,          // Too noisy
    MessageType.FILE_EDIT,     // Too noisy
    MessageType.METADATA       // Internal metadata only
  ];

  if (hiddenTypes.includes(message.type)) {
    return false;
  }

  // Check metadata hidden flag
  if (message.metadata?.hidden === true) {
    return false;
  }

  // Empty text messages
  if (message.data?.text === '') {
    return false;
  }

  return true;
}

/**
 * Get display text for a message
 *
 * @param {UnifiedMessage} message
 * @returns {string}
 */
export function getMessageDisplayText(message) {
  switch (message.type) {
    case MessageType.ASSISTANT:
    case MessageType.REASONING:
    case MessageType.RESULT:
    case MessageType.SYSTEM:
    case MessageType.STATUS:
    case MessageType.ERROR:
      return message.data.text || '';

    case MessageType.TOOL_CALL:
      return `Running ${message.data.name}...`;

    case MessageType.TOOL_OUTPUT:
      return message.data.text || '';

    case MessageType.TOOL_RESULT:
      return message.data.stdout || message.data.stderr || '';

    case MessageType.DIFF:
      return message.data.text || '';

    case MessageType.FILE_EDIT:
      return `File edit: ${message.data.success ? 'Success' : 'Failed'}`;

    case MessageType.STREAMING_DELTA:
      return message.data.text || '';

    default:
      return '';
  }
}
