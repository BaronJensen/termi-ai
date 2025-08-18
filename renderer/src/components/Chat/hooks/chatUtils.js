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
  let currentWd = normalizePath(await window.cursovable.getWorkingDirectory());
  
  if (!currentWd || currentWd !== desired) {
    const proceed = confirm(
      `Security check: Current working directory is "${currentWd || '(none)'}" but project folder is "${desired}".\n\nSwitch to the project folder before running commands?`
    );
    if (!proceed) return false;
    
    await window.cursovable.setWorkingDirectory(desired);
    currentWd = normalizePath(await window.cursovable.getWorkingDirectory());
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
  let callId = parsed.call_id || parsed.id;
  let toolCallData = parsed.tool_call;
  let subtype = parsed.subtype || parsed.status || (parsed.result ? 'completed' : (parsed.args ? 'started' : 'update'));
  
  if (!toolCallData) {
    const name = (parsed.tool && (parsed.tool.name || parsed.tool.tool || parsed.tool.type)) || parsed.name || 'tool';
    const args = (parsed.tool && (parsed.tool.args || parsed.tool.parameters)) || parsed.args || {};
    const result = parsed.result;
    const key = `${String(name).replace(/\s+/g, '')}ToolCall`;
    toolCallData = { [key]: { args, ...(result !== undefined ? { result } : {}) } };
  }
  
  if (!callId) {
    callId = generateRunId();
  }
  
  return { callId, toolCallData, subtype };
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
