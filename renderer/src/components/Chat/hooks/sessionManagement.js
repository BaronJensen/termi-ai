/**
 * Functions for managing chat sessions
 */

/**
 * Add a user message and potentially update session name
 */
export const addUserMessage = ({
  text,
  currentSessionId,
  sessions,
  setMessages,
  deriveSessionNameFromMessage
}) => {
  setMessages(m => {
    const next = [...m, { who: 'user', text, rawData: { command: text, timestamp: Date.now() } }];
    
    // Note: Session name updates are now handled by the SessionProvider
    // This function only adds the user message to the current session
    return next;
  });
};

/**
 * Create a streaming assistant message
 */
export const createStreamingMessage = ({ setMessages, streamIndexRef }) => {
  let streamIdx;
  setMessages(m => {
    streamIdx = m.length;
    streamIndexRef.current = streamIdx;
    return [...m, { who: 'assistant', text: '', isStreaming: true, rawData: null }];
  });
  return streamIdx;
};

/**
 * Update session with cursor-agent session ID
 */
export const updateSessionWithCursorId = ({
  parsed,
  currentSessionId,
  sessions,
  setSessions,
  saveSessions
}) => {
  if (parsed.session_id && parsed.session_id !== currentSessionId) {
    const currentSession = sessions.find(s => s.id === currentSessionId);
    if (currentSession) {
      const updatedSessions = sessions.map(session => 
        session.id === currentSessionId 
          ? { ...session, cursorSessionId: parsed.session_id, updatedAt: Date.now() }
          : session
      );
      setSessions(updatedSessions);
      saveSessions(updatedSessions);
      console.log(`Session ${currentSessionId} linked to cursor-agent session: ${parsed.session_id}`);
    }
  }
};

/**
 * Get the session ID to use for cursor-agent
 */
export const getSessionIdForCursor = ({ sessions, currentSessionId }) => {
  const currentSession = sessions.find(s => s.id === currentSessionId);
  return currentSession?.cursorSessionId || currentSessionId;
};

/**
 * Mark all tool calls as completed
 */
export const markAllToolCallsCompleted = ({ setToolCalls, currentSessionId }) => {
  setToolCalls(currentSessionId, prev => {
    const newMap = new Map();
    for (const [callId, toolCallInfo] of prev.entries()) {
      newMap.set(callId, {
        ...toolCallInfo,
        isCompleted: true,
        completedAt: Date.now(),
        lastUpdated: Date.now()
      });
    }
    return newMap;
  });
};

/**
 * Create final result message
 */
export const createFinalResultMessage = ({
  finalText,
  streamIndexRef,
  toolCalls,
  setMessages,
  setHideToolCallIndicators
}) => {
  setHideToolCallIndicators(true);
  
  setMessages(m => {
    const idx = streamIndexRef.current;
    if (idx >= 0 && idx < m.length) {
      const updated = [...m];
      const toolCallsSnapshot = Array.from(toolCalls.entries()).map(([id, info]) => ({ id, ...info }));
      
      // Freeze the streamed bubble as-is
      updated[idx] = { ...updated[idx], isStreaming: false };
      
      // Insert a new bubble with the final result
      const finalBubble = {
        who: 'assistant',
        text: finalText,
        isStreaming: false,
        rawData: { result: 'success', text: finalText, toolCalls: toolCallsSnapshot },
        showActionLog: true,
      };
      updated.splice(idx + 1, 0, finalBubble);
      return updated;
    }
    return m;
  });
};

/**
 * Clean up streaming state
 */
export const cleanupStreamingState = ({
  runTimeoutRef,
  unsubRef,
  streamIndexRef,
  runIdRef,
  setSessionBusy
}) => {
  if (runTimeoutRef.current) { 
    try { clearTimeout(runTimeoutRef.current); } catch {} 
    runTimeoutRef.current = null; 
  }
  if (unsubRef.current) { 
    try { unsubRef.current(); } catch {} 
    unsubRef.current = null; 
  }
  streamIndexRef.current = -1;
  runIdRef.current = null;
  setSessionBusy();
};
