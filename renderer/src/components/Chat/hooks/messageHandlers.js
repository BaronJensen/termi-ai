import { loadSettings } from '../../../store/settings';
import { 
  stripAnsiAndControls, 
  extractJsonCandidate, 
  appendWithOverlap,
  normalizeToolCallData,
  generateRunId
} from './chatUtils';

/**
 * Handle JSON log lines from cursor-agent
 */
export const handleJsonLogLine = async (parsed, {
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
  setAccumulatedText,
  lastChunkRef,
  setSessionBusy,
  runTimeoutRef,
  unsubRef,
  updateSessionWithCursorId
}) => {
  console.log('Parsed log line:', parsed);
  console.log('Tool call detection:', {
    type: parsed.type,
    hasToolCall: !!parsed.tool_call,
    hasTool: !!parsed.tool,
    hasName: !!parsed.name,
    isToolCall: parsed.type === 'tool_call' || parsed.type === 'tool' || parsed.type === 'function_call' || parsed.tool_call || parsed.tool || parsed.name === 'tool'
  });
  
  // Handle assistant messages - accumulate text content (role: assistant only)
  if (
    parsed.type === 'assistant' &&
    parsed.message && parsed.message.role === 'assistant' &&
    parsed.message.content
  ) {
    const chunkText = parsed.message.content
      .filter(c => c && c.type === 'text' && typeof c.text === 'string')
      .map(c => c.text)
      .join('');
    if (chunkText) {
      const newText = appendWithOverlap(accumulatedText, chunkText, lastChunkRef.current);
      setAccumulatedText(newText);
      lastChunkRef.current = chunkText;
        
      setMessages(m => {
        const idx = streamIndexRef.current;
        if (idx >= 0 && idx < m.length) {
          const updated = [...m];
          const currentText = String((updated[idx] && updated[idx].text) || '').trim();
          const currentWords = currentText ? currentText.split(/\s+/).filter(Boolean).length : 0;
          const newWords = String(newText || '').trim().split(/\s+/).filter(Boolean).length;
          const hasShown = currentWords >= 1; // Bubble already visible
          const meetsThreshold = newWords >= 5; // Show only after 5 words
          if (hasShown || meetsThreshold) {
            updated[idx] = { ...updated[idx], text: newText, isStreaming: true };
          }
          return updated;
        }
        return m;
      });
        
        await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
  
  // Extract session ID if present and find the correct session to route this message to
  let targetSessionId = currentSessionId;
  console.log('Session routing:', {
    currentSessionId,
    parsedSessionId: parsed.session_id,
    sessionsCount: sessions.length,
    sessionIds: sessions.map(s => ({ id: s.id, cursorSessionId: s.cursorSessionId }))
  });
  
  if (parsed.session_id) {
    // Find the session that has this cursor-agent session ID
    const sessionWithCursorId = sessions.find(s => s.cursorSessionId === parsed.session_id);
    if (sessionWithCursorId) {
      targetSessionId = sessionWithCursorId.id;
      console.log(`Routing message to session: ${targetSessionId} (cursor-agent session: ${parsed.session_id})`);
    } else {
      // New cursor-agent session detected
      console.log(`🆔 New cursor-agent session detected: ${parsed.session_id}`);
      console.log(`🆔 Current sessionId: ${currentSessionId}`);
      console.log(`🆔 Available sessions:`, sessions.map(s => ({ id: s.id, name: s.name, cursorSessionId: s.cursorSessionId })));
      
      // Check if we have a current session without a cursorSessionId (temporary session)
      const currentSession = sessions.find(s => s.id === currentSessionId);
      console.log(`🆔 Found current session:`, currentSession ? { id: currentSession.id, name: currentSession.name, cursorSessionId: currentSession.cursorSessionId } : null);
      
      if (currentSession && !currentSession.cursorSessionId) {
        // Update the temporary session with the real cursor session ID
        console.log(`🆔 Updating temporary session ${currentSessionId} with cursor session ID: ${parsed.session_id}`);
        if (updateSessionWithCursorId) {
          updateSessionWithCursorId(currentSessionId, parsed.session_id);
        }
        targetSessionId = currentSessionId;
      } else {
        // Either no current session or current session already has a cursorSessionId
        // Let updateSessionWithCursorId handle creating a new session or finding a temp session
        console.log(`🆔 No suitable session found, letting updateSessionWithCursorId handle it`);
        console.log(`🆔 Current session exists: ${!!currentSession}, has cursorSessionId: ${currentSession?.cursorSessionId}`);
        if (updateSessionWithCursorId) {
          updateSessionWithCursorId(null, parsed.session_id);
        }
        // targetSessionId will remain currentSessionId for now
      }
    }
  }
  
  console.log('Final target session ID:', targetSessionId);
  
  // Handle tool calls
  if (parsed.type === 'tool_call' || parsed.type === 'tool' || parsed.type === 'function_call' || parsed.tool_call || parsed.tool || parsed.name === 'tool') {
    console.log('Processing tool call:', { parsed, targetSessionId });
    const { callId, toolCallData, subtype } = normalizeToolCallData(parsed);
    console.log('Normalized tool call data:', { callId, toolCallData, subtype });
    
    setSessionToolCalls(targetSessionId, prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(callId);
      
      if (existing) {
        newMap.set(callId, {
          ...existing,
          toolCall: toolCallData,
          isCompleted: subtype === 'completed' || subtype === 'end' || subtype === 'finished',
          isStarted: subtype === 'started' || subtype === 'start',
          completedAt: (subtype === 'completed' || subtype === 'end' || subtype === 'finished') ? Date.now() : existing.completedAt,
          rawData: parsed,
          lastUpdated: Date.now()
        });
      } else {
        newMap.set(callId, {
          toolCall: toolCallData,
          isCompleted: subtype === 'completed' || subtype === 'end' || subtype === 'finished',
          isStarted: subtype === 'started' || subtype === 'start',
          startedAt: Date.now(),
          completedAt: (subtype === 'completed' || subtype === 'end' || subtype === 'finished') ? Date.now() : null,
          rawData: parsed,
          lastUpdated: Date.now()
        });
      }
      return newMap;
    });
    // also mirror into ref when available so final snapshot can include latest
    if (typeof window !== 'undefined' && window.requestAnimationFrame) {
      try {
        const dataToStore = normalizeToolCallData(parsed);
        if (dataToStore && dataToStore.callId) {
          const { callId, toolCallData, subtype } = dataToStore;
          if (toolCallsRef && toolCallsRef.current) {
            const existing = toolCallsRef.current.get(callId);
            if (existing) {
              toolCallsRef.current.set(callId, {
                ...existing,
                toolCall: toolCallData,
                isCompleted: subtype === 'completed' || subtype === 'end' || subtype === 'finished',
                isStarted: subtype === 'started' || subtype === 'start',
                completedAt: (subtype === 'completed' || subtype === 'end' || subtype === 'finished') ? Date.now() : existing.completedAt,
                rawData: parsed,
                lastUpdated: Date.now()
              });
            } else {
              toolCallsRef.current.set(callId, {
                toolCall: toolCallData,
                isCompleted: subtype === 'completed' || subtype === 'end' || subtype === 'finished',
                isStarted: subtype === 'started' || subtype === 'start',
                startedAt: Date.now(),
                completedAt: (subtype === 'completed' || subtype === 'end' || subtype === 'finished') ? Date.now() : null,
                rawData: parsed,
                lastUpdated: Date.now()
              });
            }
          }
        }
      } catch {}
    }
  }
  
  // Final result: replace streamed text with final text
  if (parsed.type === 'result') {
    setSessionToolCalls(targetSessionId, prev => {
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
    
    setSessionHideToolCallIndicators(targetSessionId, true);
    const finalText = typeof parsed.result === 'string' ? parsed.result : (parsed.output || accumulatedText || '');
    lastChunkRef.current = '';
    
    setMessages(m => {
      const idx = streamIndexRef.current;
      const callsSource = (toolCallsRef && toolCallsRef.current instanceof Map) ? toolCallsRef.current : getCurrentSessionToolCalls();
      const toolCallsSnapshot = Array.from(callsSource.entries()).map(([id, info]) => ({ id, ...info }));
      if (idx >= 0 && idx < m.length) {
        const updated = [...m];
        updated[idx] = {
          who: 'assistant',
          text: finalText,
          isStreaming: false,
          rawData: { result: 'success', text: finalText, toolCalls: toolCallsSnapshot },
          showActionLog: true,
        };
        return updated;
      }
      // No streaming bubble present: append a single final bubble
      return [...m, {
        who: 'assistant',
        text: finalText,
        isStreaming: false,
        rawData: { result: 'success', text: finalText, toolCalls: toolCallsSnapshot },
        showActionLog: true,
      }];
    });
    
    // Clean up
    if (runTimeoutRef.current) { try { clearTimeout(runTimeoutRef.current); } catch {} runTimeoutRef.current = null; }
    if (unsubRef.current) { try { unsubRef.current(); } catch {} unsubRef.current = null; }
    streamIndexRef.current = -1;
    setSessionBusy(targetSessionId, false);
    
    return true; // Signal completion
  }
  
  return false; // Not complete
};

/**
 * Handle stream log lines (fallback for older runners)
 */
export const handleStreamLogLine = async (line, {
  runId,
  currentSessionId,
  sessions,
  setMessages,
  streamIndexRef,
  setSessionToolCalls,
  getCurrentSessionToolCalls,
  setSessionHideToolCallIndicators,
  accumulatedText,
  setAccumulatedText,
  lastChunkRef,
  setSessionBusy,
  runTimeoutRef,
  unsubRef,
  sawJsonRef
}) => {
  // If we already saw JSON this run, ignore raw stream lines to avoid duplication
  if (sawJsonRef.current) {
    return false;
  }
  
  try {
    let parsed;
    try {
      parsed = JSON.parse(line);
    } catch {
      const candidate = extractJsonCandidate(line);
      if (!candidate) throw new Error('no-json');
      parsed = JSON.parse(candidate);
    }
    
    // Re-use JSON handler for consistency
    const isComplete = await handleJsonLogLine(parsed, {
      runId,
      currentSessionId,
      sessions,
      setMessages,
      streamIndexRef,
      setSessionToolCalls,
      getCurrentSessionToolCalls,
      setSessionHideToolCallIndicators,
      accumulatedText,
      setAccumulatedText,
      lastChunkRef,
      setSessionBusy,
      runTimeoutRef,
      unsubRef
    });
    
    return isComplete;
  } catch {
    return false;
  }
};

/**
 * Handle end marker for legacy runners
 */
export const handleEndMarker = ({
  setSessionToolCalls,
  setSessionHideToolCallIndicators,
  setMessages,
  streamIndexRef,
  getCurrentSessionToolCalls,
  accumulatedText,
  setSessionBusy,
  currentSessionId,
  runTimeoutRef,
  unsubRef
}) => {
  // Mark all active tool calls as completed
  setSessionToolCalls(currentSessionId, prev => {
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
  
  // Hide tool call indicators after result
  setSessionHideToolCallIndicators(currentSessionId, true);
  
  // Mark the streaming message as complete
  if (accumulatedText.trim()) {
    setMessages(m => {
      const idx = streamIndexRef.current;
      if (idx >= 0 && idx < m.length) {
        const updated = [...m];
        updated[idx] = { ...updated[idx], isStreaming: false };
        return updated;
      }
      return m;
    });
    
    // Update the existing streamed bubble as the final result
    setMessages(m => {
      const idx = streamIndexRef.current;
      if (idx >= 0 && idx < m.length) {
        const updated = [...m];
        const toolCallsSnapshot = Array.from(getCurrentSessionToolCalls().entries()).map(([id, info]) => ({ id, ...info }));
        updated[idx] = {
          ...updated[idx],
          isStreaming: false,
          rawData: { result: 'success', text: accumulatedText, toolCalls: toolCallsSnapshot },
          showActionLog: true,
        };
        return updated;
      }
      return m;
    });
  } else {
    // If we didn't get any assistant content, show a fallback message
    setMessages(m => {
      const idx = streamIndexRef.current;
      if (idx >= 0 && idx < m.length) {
        const updated = [...m];
        updated[idx] = { ...updated[idx], text: 'No response content received from cursor-agent.', isStreaming: false, rawData: { error: 'No response content' } };
        return updated;
      }
      return m;
    });
  }
  
  // Clean up streaming state and allow new input
  if (runTimeoutRef.current) { try { clearTimeout(runTimeoutRef.current); } catch {} runTimeoutRef.current = null; }
  if (unsubRef.current) { 
    try { unsubRef.current(); } catch {} 
    unsubRef.current = null; 
  }
  streamIndexRef.current = -1;
  setSessionBusy(currentSessionId, false);
  
  return true; // Signal completion
};

/**
 * Create the log stream subscription handler
 */
export const createLogStreamHandler = ({
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
  setAccumulatedText,
  lastChunkRef,
  setSessionBusy,
  runTimeoutRef,
  unsubRef,
  sawJsonRef,
  updateSessionWithCursorId
}) => {
  return async (payload) => {
    console.log(`🔍 createLogStreamHandler received payload:`, payload);
    console.log(`🔍 Expected runId: ${runId}, received runId: ${payload?.runId}`);
    console.log(`🔍 runId types - expected: ${typeof runId} (${runId}), received: ${typeof payload?.runId} (${payload?.runId})`);
    console.log(`🔍 runId comparison: ${payload?.runId === runId}`);
    
    // Filter messages by runId to ensure we only process messages for this specific run
    if (!payload || payload.runId !== runId) {
      console.log(`🚫 Ignoring message for different runId: ${payload?.runId} (expected: ${runId})`);
      return;
    }
    
    console.log(`✅ Processing message for runId: ${runId}, sessionId: ${payload.sessionId || 'none'}`);
    console.log('Message payload:', { level: payload.level, linePreview: payload.line?.substring(0, 100) });
    
    try {
      // Prefer clean JSON emitted by the runner; ignore non-JSON stream lines to avoid duplicates
      if (payload.level === 'json') {
        sawJsonRef.current = true;
        const parsed = JSON.parse(String(payload.line || ''));
        const lines = [parsed];
        
        for (const parsed of lines) {
          const isComplete = await handleJsonLogLine(parsed, {
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
            setAccumulatedText,
            lastChunkRef,
            setSessionBusy,
            runTimeoutRef,
            unsubRef,
            updateSessionWithCursorId
          });
          
          if (isComplete) return;
        }
        return;
      }

      // Fallback: parse stream lines (older runner)
      const sanitized = stripAnsiAndControls(payload.line);
      const lines = sanitized.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        const isComplete = await handleStreamLogLine(line, {
          runId,
          currentSessionId,
          sessions,
          setMessages,
          streamIndexRef,
          setSessionToolCalls,
          getCurrentSessionToolCalls,
          setSessionHideToolCallIndicators,
          accumulatedText,
          setAccumulatedText,
          lastChunkRef,
          setSessionBusy,
          runTimeoutRef,
          unsubRef,
          sawJsonRef
        });
        
        if (isComplete) return;
      }
    } catch (error) {
      console.error('Error processing log line:', error);
    }
  };
};
