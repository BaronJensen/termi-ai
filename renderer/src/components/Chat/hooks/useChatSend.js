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
  // State setters
  setMessages,
  setSessionBusy, // Changed from setBusy to setSessionBusy
  setSessionToolCalls, // Changed from setToolCalls to setSessionToolCalls
  setSessionHideToolCallIndicators, // Changed from setHideToolCallIndicators to setSessionHideToolCallIndicators
  
  // State values
  input,
  setInput,
  getCurrentSessionBusy, // Changed from busy to getCurrentSessionBusy
  cwd,
  model,
  sessions,
  currentSessionId,
  getCurrentSessionToolCalls, // Changed from toolCalls to getCurrentSessionToolCalls
  
  // Functions
  deriveSessionNameFromMessage,
  checkTerminalStatus,
  updateSessionWithCursorId, // Add function to update session with cursor ID
  
  // Project context
  projectId
}) {
  // Refs for managing streaming state
  const unsubRef = useRef(null);
  const streamIndexRef = useRef(-1);
  const runIdRef = useRef(null);
  const runTimeoutRef = useRef(null);
  const lastChunkRef = useRef('');
  const sawJsonRef = useRef(false);
  const toolCallsRef = useRef(new Map());

  const send = useCallback(async (textOverride) => {
    const text = (typeof textOverride === 'string' ? textOverride : input).trim();
    
    // Validate input
    const validation = validateInput({ text, cwd, busy: getCurrentSessionBusy() });
    if (!validation.isValid) {
      if (validation.error) alert(validation.error);
      return;
    }
    
    // Security check: ensure process working directory matches the project folder
    const directoryVerified = await verifyAndSwitchWorkingDirectory(cwd);
    if (!directoryVerified) return;
    
    if (typeof textOverride !== 'string') setInput('');
    resetTextareaHeight();
    
    // Reset tool call indicator visibility for new conversation
    setSessionHideToolCallIndicators(currentSessionId, false);
    
    // Add user message and potentially update session name
    addUserMessage({
      text,
      currentSessionId,
      sessions,
      setMessages,
      deriveSessionNameFromMessage
    });
    
    setSessionBusy(currentSessionId, true);
    
    try {
      // Prepare streaming message and subscribe to logs for this run
      const runId = generateRunId();
      runIdRef.current = runId;
      
      // Reset any previous local timeout and start a new one for this run
      if (runTimeoutRef.current) { 
        try { clearTimeout(runTimeoutRef.current); } catch {} 
        runTimeoutRef.current = null; 
      }
      
      // Track accumulated assistant text
      const streamIdx = createStreamingMessage({ setMessages, streamIndexRef });
      let accumulatedText = '';
      lastChunkRef.current = '';
      sawJsonRef.current = false;

      // Start a local timeout aligned with settings
      try {
        const { cursorAgentTimeoutMs } = loadSettings();
        runTimeoutRef.current = createCursorAgentTimeout(
          cursorAgentTimeoutMs, 
          runId, 
          (currentRunId) => {
            // Only act if this run is still the active one
            if (runIdRef.current !== currentRunId) return;
            handleClientTimeout({ runId: currentRunId, streamIndexRef, setMessages, setSessionBusy, currentSessionId });
          }
        );
      } catch {}
      
      // Keep a live mirror of toolCalls in a ref for snapshotting at result time
      try { toolCallsRef.current = getCurrentSessionToolCalls() instanceof Map ? new Map(getCurrentSessionToolCalls()) : new Map(); } catch { toolCallsRef.current = new Map(); }

      // Register this run with the global log router instead of subscribing directly
      const logHandler = createLogStreamHandler({
        runId,
        currentSessionId,
        sessions,
        setMessages,
        streamIndexRef,
        setSessionToolCalls,
        getCurrentSessionToolCalls,
        toolCallsRef,
        setSessionHideToolCallIndicators,
        accumulatedText,
        setAccumulatedText: (text) => { accumulatedText = text; },
        lastChunkRef,
        setSessionBusy: () => setSessionBusy(currentSessionId, false),
        runTimeoutRef,
        unsubRef,
        sawJsonRef,
        updateSessionWithCursorId
      });
      
      // Register this run's handler with the centralized log router
      if (window.cursovableLogRouter) {
        console.log(`🔧 useChatSend: Registering handler for runId: ${runId}`);
        window.cursovableLogRouter.registerHandler(runId, logHandler);
        unsubRef.current = () => {
          console.log(`🔧 useChatSend: Unregistering handler for runId: ${runId}`);
          window.cursovableLogRouter.unregisterHandler(runId);
        };
      } else {
        // Fallback to direct subscription if router not available
        console.warn('Log router not available, using direct subscription (may cause cross-contamination)');
        unsubRef.current = window.cursovable.onCursorLog(logHandler);
      }

      // For brand new sessions, don't resume until the second message.
      // If this session lacks a cursorSessionId, pass undefined so runner starts fresh.
      let sessionIdToUse;
      try {
        const currentSession = sessions.find(s => s.id === currentSessionId);
        sessionIdToUse = currentSession && currentSession.cursorSessionId ? currentSession.cursorSessionId : undefined;
      } catch { sessionIdToUse = undefined; }

      const { cursorAgentTimeoutMs } = loadSettings();
      
      // Print the current terminal folder in the cursor debug log before running
      await logCursorDebugInfo({ runId, cwd });

      const sForRun = loadSettings();
      const res = await window.cursovable.runCursor({ 
        message: text, 
        cwd: cwd || undefined, 
        runId,
        sessionId: sessionIdToUse,
        ...(model ? { model } : {}),
        ...(typeof cursorAgentTimeoutMs === 'number' ? { timeoutMs: cursorAgentTimeoutMs } : {}),
        ...(sForRun.apiKey && String(sForRun.apiKey).trim() ? { apiKey: String(sForRun.apiKey).trim() } : {})
      });
      
      // We just need to ensure the process completed successfully
      if (res.type === 'error') {
        throw new Error(res.error || 'Unknown error occurred');
      }
      
      // Log successful response for debugging
      console.log('runCursor completed successfully:', res);
      
      // Fallback: If we're still streaming after runCursor completes, assume it's done
      if (streamIndexRef.current >= 0 && accumulatedText.trim()) {
        handleFallbackCompletion({
          streamIndexRef,
          accumulatedText,
          toolCalls: getCurrentSessionToolCalls(),
          setToolCalls: setSessionToolCalls,
          setHideToolCallIndicators: setSessionHideToolCallIndicators,
          setMessages,
          runTimeoutRef,
          unsubRef,
          setSessionBusy,
          currentSessionId
        });
      }
    } catch (e) {
      await handleError({
        error: e,
        streamIndexRef,
        setMessages,
        checkTerminalStatus
      });
    } finally {
      // Clean up streaming state
      cleanupStreamingState({
        runTimeoutRef,
        unsubRef,
        streamIndexRef,
        runIdRef,
        setSessionBusy: () => setSessionBusy(currentSessionId, false)
      });
    }
  }, [
    input, setInput, cwd, model, sessions, currentSessionId,
    setMessages, setSessionBusy, setSessionToolCalls, setSessionHideToolCallIndicators,
    deriveSessionNameFromMessage, checkTerminalStatus, updateSessionWithCursorId
  ]);

  // Return the send function and cleanup function
  return {
    send,
    cleanup: () => {
      cleanupStreamingState({
        runTimeoutRef,
        unsubRef,
        streamIndexRef,
        runIdRef,
        setSessionBusy: () => setSessionBusy(currentSessionId, false)
      });
    }
  };
}
