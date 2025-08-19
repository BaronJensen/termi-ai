import { useRef, useCallback } from 'react';
import { loadSettings } from '../../../store/settings';
import { 
  verifyAndSwitchWorkingDirectory, 
  resetTextareaHeight, 
  generateRunId,
  createCursorAgentTimeout
} from './chatUtils';
import { 
  addUserMessage, 
  createStreamingMessage,
  getSessionIdForCursor,
  cleanupStreamingState
} from './sessionManagement';
import { 
  createLogStreamHandler 
} from './messageHandlers';
import { 
  handleError, 
  handleFallbackCompletion, 
  handleClientTimeout,
  validateInput,
  logCursorDebugInfo
} from './errorHandling';

export function useChatSend({
  currentSessionId,
  sessions,
  setSessionBusy,
  setSessionToolCalls,
  getCurrentSessionToolCalls,
  setSessionHideToolCallIndicators,
  markSessionRunningTerminal,
  send // Get the centralized send function from SessionProvider
}) {
  const sendMessage = useCallback(async (text) => {
    console.log(`🔍 useChatSend.sendMessage called with:`, { text, textType: typeof text, textLength: text?.length });
    
    if (!text || !text.trim()) {
      console.log('Empty message, not sending');
      console.log('Text validation failed:', { text, trimmed: text?.trim(), isEmpty: !text, isWhitespace: !text?.trim() });
      return;
    }

    if (!currentSessionId) {
      console.error('No current session ID, cannot send message');
      return;
    }

    // Get the current session object
    const currentSession = sessions.find(s => s.id === currentSessionId);
    if (!currentSession) {
      console.error(`Current session ${currentSessionId} not found in sessions array`);
      return;
    }

    console.log(`🚀 useChatSend: Sending message "${text}" in session:`, currentSession);
    console.log(`🚀 useChatSend: send function available:`, !!send, typeof send);

    // Mark this session as running terminal
    markSessionRunningTerminal(currentSessionId);

    try {
      // Use the centralized send function from SessionProvider
      await send(text, currentSession);
      console.log(`✅ Message sent successfully via SessionProvider.send`);
    } catch (error) {
      console.error(`❌ Error sending message via SessionProvider.send:`, error);
      
      // Note: Error messages are now handled by SessionProvider
      console.log(`ℹ️  Error details logged above - SessionProvider will handle error display`);
    } finally {
      // Mark session as not busy
      setSessionBusy(currentSessionId, false);
    }
  }, [currentSessionId, sessions, markSessionRunningTerminal, send, setSessionBusy]);

  return { sendMessage };
}
