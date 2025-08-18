import { formatErrorMessage } from './chatUtils';
import { 
  markAllToolCallsCompleted, 
  createFinalResultMessage, 
  cleanupStreamingState 
} from './sessionManagement';

/**
 * Handle errors and render them in the UI
 */
export const handleError = async ({
  error,
  streamIndexRef,
  setMessages,
  checkTerminalStatus
}) => {
  // Check if it's a terminal-related error
  let errorMessage = error.message || String(error);
  const formattedError = formatErrorMessage(errorMessage);
  
  // Render error in the streaming bubble if available
  setMessages(m => {
    const idx = streamIndexRef.current;
    if (idx >= 0 && idx < m.length) {
      const updated = [...m];
      updated[idx] = { who: 'assistant', text: formattedError, isStreaming: false, rawData: { error: formattedError } };
      return updated;
    }
    return [...m, { who: 'assistant', text: formattedError, isStreaming: false, rawData: { error: formattedError } }];
  });
  
  // Update terminal status after error
  await checkTerminalStatus();
};

/**
 * Handle fallback completion when runCursor completes but streaming is still active
 */
export const handleFallbackCompletion = ({
  streamIndexRef,
  accumulatedText,
  toolCalls,
  setToolCalls,
  setHideToolCallIndicators,
  setMessages,
  runTimeoutRef,
  unsubRef,
  setBusy
}) => {
  // Mark all active tool calls as completed
  markAllToolCallsCompleted({ setToolCalls });
  
  // Hide tool call indicators after result
  setHideToolCallIndicators(true);
  
  // Mark streaming as complete
  setMessages(m => {
    const idx = streamIndexRef.current;
    if (idx >= 0 && idx < m.length) {
      const updated = [...m];
      updated[idx] = { ...updated[idx], isStreaming: false };
      return updated;
    }
    return m;
  });
  
  // Create completion message if we have content
  if (accumulatedText.trim()) {
    // Update the existing streamed bubble with final metadata instead of adding a duplicate
    setMessages(m => {
      const idx = streamIndexRef.current;
      if (idx >= 0 && idx < m.length) {
        const updated = [...m];
        const toolCallsSnapshot = Array.from(toolCalls.entries()).map(([id, info]) => ({ id, ...info }));
        updated[idx] = {
          ...updated[idx],
          isStreaming: false,
          rawData: { result: 'completed', text: accumulatedText, toolCalls: toolCallsSnapshot },
          showActionLog: true,
        };
        return updated;
      }
      return m;
    });
  }
  
  // Clean up streaming state and allow new input
  cleanupStreamingState({
    runTimeoutRef,
    unsubRef,
    streamIndexRef,
    runIdRef: { current: null }, // We don't have access to runIdRef here
    setBusy
  });
};

/**
 * Handle timeout from client timer
 */
export const handleClientTimeout = ({
  runId,
  streamIndexRef,
  setMessages,
  setBusy
}) => {
  setMessages(m => {
    const idx = streamIndexRef.current;
    const timeoutText = '**Terminal timeout detected (client timer)**: No result received before timeout. The process may still be running in the background.';
    if (idx >= 0 && idx < m.length) {
      const updated = [...m];
      updated[idx] = { who: 'assistant', text: timeoutText, isStreaming: false, rawData: { error: 'client_timeout' } };
      return updated;
    }
    return [...m, { who: 'assistant', text: timeoutText, isStreaming: false, rawData: { error: 'client_timeout' } }];
  });
  setBusy(false);
};

/**
 * Validate input before processing
 */
export const validateInput = ({ text, cwd, busy }) => {
  if (!text.trim()) {
    return { isValid: false, error: 'No text to send' };
  }
  
  if (!cwd) {
    return { isValid: false, error: 'Please select a working directory first using the "Change" button above.' };
  }
  
  if (busy) {
    return { isValid: false, error: 'Already processing a request, ignoring new input' };
  }
  
  return { isValid: true };
};

/**
 * Log cursor debug information
 */
export const logCursorDebugInfo = async ({ runId, cwd }) => {
  try {
    const currentWd = await window.cursovable.getWorkingDirectory();
    await window.cursovable.cursorDebugLog({ 
      line: `[cursor-agent] Working directory: ${currentWd || '(none)'}`, 
      runId 
    });
  } catch (error) {
    console.warn('Failed to log cursor debug info:', error);
  }
};
