// Utility functions for chat functionality

/**
 * Normalize a file path for comparison
 */
export const normalizePath = (p) => (p || '').replace(/\\/g, '/').replace(/\/+$/,'');

/**
 * Strip ANSI escape codes and control characters from terminal output
 */
export const stripAnsiAndControls = (input) => {
  try {
    return String(input || '')
      .replace(/\x1B\[[0-?]*[ -\/]*[@-~]/g, '')
      .replace(/\u001b\[[0-9;]*[A-Za-z]/g, '')
      .replace(/\x1b\[[0-9;]*[A-Za-z]/g, '')
      .replace(/\[[0-9;]*m/g, '')
      .replace(/\r(?!\n)/g, '\n')
      .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '');
  } catch { 
    return String(input || ''); 
  }
};

/**
 * Extract JSON candidate from a line that might contain JSON
 */
export const extractJsonCandidate = (line) => {
  if (!line) return null;
  const startObj = line.indexOf('{');
  const startArr = line.indexOf('[');
  let start = -1;
  let end = -1;
  
  if (startObj !== -1 && (startArr === -1 || startObj < startArr)) {
    start = startObj;
    end = line.lastIndexOf('}');
  } else if (startArr !== -1) {
    start = startArr;
    end = line.lastIndexOf(']');
  }
  
  if (start !== -1 && end !== -1 && end > start) {
    return line.slice(start, end + 1);
  }
  return null;
};

/**
 * Append text with overlap deduplication to avoid repeated fragments
 */
export const appendWithOverlap = (base, chunk, lastChunk = '') => {
  if (!chunk) return base;
  if (lastChunk && lastChunk === chunk) return base;
  
  const maxOverlap = Math.min(base.length, chunk.length, 2000);
  for (let k = maxOverlap; k > 0; k--) {
    if (base.endsWith(chunk.slice(0, k))) {
      return base + chunk.slice(k);
    }
  }
  return base + chunk;
};

/**
 * Generate a unique run ID
 */
export const generateRunId = () => `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;

/**
 * Check if working directory matches project folder and switch if needed
 */
export const verifyAndSwitchWorkingDirectory = async (desiredCwd) => {
  const normalizePath = (p) => (p || '').replace(/\\/g, '/').replace(/\/+$/,'');
  const desired = normalizePath(desiredCwd);
  let currentWd = normalizePath(await window.termiAI.getWorkingDirectory());
  
  if (!currentWd || currentWd !== desired) {
    const proceed = confirm(
      `Security check: Current working directory is "${currentWd || '(none)'}" but project folder is "${desired}".\n\nSwitch to the project folder before running commands?`
    );
    if (!proceed) return false;
    
    await window.termiAI.setWorkingDirectory(desired);
    currentWd = normalizePath(await window.termiAI.getWorkingDirectory());
    if (currentWd !== desired) {
      alert('Failed to switch working directory to the project folder. Aborting to keep your environment safe.');
      return false;
    }
  }
  return true;
};

/**
 * Reset textarea height to default
 */
export const resetTextareaHeight = () => {
  const textarea = document.querySelector('.input textarea');
  if (textarea) {
    textarea.style.height = '64px';
  }
};

/**
 * Create a timeout for cursor agent operations
 */
export const createCursorAgentTimeout = (timeoutMs, runId, onTimeout) => {
  const ms = typeof timeoutMs === 'number' && timeoutMs > 0 ? timeoutMs : 900000;
  return setTimeout(() => onTimeout(runId), ms);
};

/**
 * Normalize tool call data from various formats
 */
export const normalizeToolCallData = (parsed) => {
  console.log('🔧 normalizeToolCallData input:', parsed);

  let callId = null;
  let toolCallData = null;
  let subtype = 'started';

  // Handle Codex format: {type: "tool_call", tool: "bash", command: "...", call_id: "..."}
  if (parsed.type === 'tool_call' && parsed.tool && parsed.command) {
    callId = parsed.call_id || generateRunId();
    toolCallData = {
      name: parsed.command, // Use command as the display name
      tool: parsed.tool,
      command: parsed.command,
      args: {}
    };
    subtype = 'started';
    console.log('🔧 Using Codex tool_call format:', { callId, toolCallData, subtype });
  }
  // Handle tool_calls array format (most common)
  else if (parsed.tool_calls && Array.isArray(parsed.tool_calls) && parsed.tool_calls.length > 0) {
    const firstToolCall = parsed.tool_calls[0];
    callId = firstToolCall.id || firstToolCall.call_id || generateRunId();
    toolCallData = firstToolCall;
    subtype = firstToolCall.subtype || parsed.subtype || 'started';
    console.log('🔧 Using tool_calls array format:', { callId, toolCallData, subtype });
  }
  // Handle single tool_call format
  else if (parsed.tool_call) {
    callId = parsed.tool_call.id || parsed.tool_call.call_id || parsed.call_id || parsed.id || generateRunId();
    toolCallData = parsed.tool_call;
    subtype = parsed.tool_call.subtype || parsed.subtype || parsed.status || 'started';
    console.log('🔧 Using single tool_call format:', { callId, toolCallData, subtype });
  }
  // Handle legacy tool format
  else if (parsed.tool) {
    callId = parsed.tool.id || parsed.tool.call_id || parsed.call_id || parsed.id || generateRunId();
    const name = parsed.tool.name || parsed.tool.tool || parsed.tool.type || parsed.name || 'tool';
    const args = parsed.tool.args || parsed.tool.parameters || parsed.args || {};
    const result = parsed.result;
    toolCallData = { name, args, result };
    subtype = parsed.tool.subtype || parsed.subtype || parsed.status || 'started';
    console.log('🔧 Using legacy tool format:', { callId, toolCallData, subtype });
  }
  // Handle direct properties
  else if (parsed.name === 'tool' || parsed.args) {
    callId = parsed.call_id || parsed.id || generateRunId();
    const name = parsed.name || 'tool';
    const args = parsed.args || {};
    const result = parsed.result;
    toolCallData = { name, args, result };
    subtype = parsed.subtype || parsed.status || (parsed.result ? 'completed' : 'started');
    console.log('🔧 Using direct properties format:', { callId, toolCallData, subtype });
  }

  // Determine subtype based on message content or type
  if (parsed.type === 'result' || parsed.completed) {
    subtype = 'completed';
  } else if (parsed.started) {
    subtype = 'started';
  }

  if (!callId) {
    callId = generateRunId();
  }

  const result = { callId, toolCallData, subtype };
  console.log('🔧 normalizeToolCallData result:', result);
  return result;
};

/**
 * Format error messages for better user experience
 */
export const formatErrorMessage = (errorMessage) => {
  if (errorMessage.includes('timeout') || errorMessage.includes('idle')) {
    return `**Terminal timeout detected:** ${errorMessage}\n\nThis usually means the cursor-agent process hung or is waiting for input. Try:\n\n1. **Force Cleanup** button above to kill stuck processes\n2. Check if cursor-agent needs interactive input\n3. Restart the application if the issue persists`;
  } else if (errorMessage.includes('cursor-agent')) {
    return `**Cursor agent error:** ${errorMessage}\n\nCheck if cursor-agent is properly installed and accessible.`;
  } else if (errorMessage.includes('SIGTERM') || errorMessage.includes('killed')) {
    return `**Process terminated:** ${errorMessage}\n\nThis usually means the process was killed due to timeout or cleanup. This is normal behavior.`;
  }
  return errorMessage;
};
