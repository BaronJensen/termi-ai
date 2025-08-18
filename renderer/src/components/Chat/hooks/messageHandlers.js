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
  setSessions,
  saveSessions,
  setMessages,
  streamIndexRef,
  setToolCalls,
  toolCalls,
  setHideToolCallIndicators,
  accumulatedText,
  setAccumulatedText,
  lastChunkRef,
  setBusy,
  runTimeoutRef,
  unsubRef,
  streamIndexRef
}) => {
  console.log('Parsed log line:', parsed);
  
  // Handle assistant messages - accumulate text content
  if (parsed.type === 'assistant' && parsed.message && parsed.message.content) {
    for (const content of parsed.message.content) {
      if (content.type === 'text' && content.text) {
        const newText = appendWithOverlap(accumulatedText, content.text, lastChunkRef.current);
        setAccumulatedText(newText);
        lastChunkRef.current = content.text;
        
        setMessages(m => {
          const idx = streamIndexRef.current;
          if (idx >= 0 && idx < m.length) {
            const updated = [...m];
            updated[idx] = { ...updated[idx], text: newText, isStreaming: true };
            return updated;
          }
          return m;
        });
        
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
  }
  
  // Extract session ID if present
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
  
  // Handle tool calls
  if (parsed.type === 'tool_call' || parsed.type === 'tool' || parsed.type === 'function_call' || parsed.tool_call || parsed.tool || parsed.name === 'tool') {
    const { callId, toolCallData, subtype } = normalizeToolCallData(parsed);
    
    setToolCalls(prev => {
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
  }
  
  // Final result: replace streamed text with final text
  if (parsed.type === 'result') {
    setToolCalls(prev => {
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
    
    setHideToolCallIndicators(true);
    const finalText = typeof parsed.result === 'string' ? parsed.result : (parsed.output || accumulatedText || '');
    lastChunkRef.current = '';
    
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
    
    // Clean up
    if (runTimeoutRef.current) { try { clearTimeout(runTimeoutRef.current); } catch {} runTimeoutRef.current = null; }
    if (unsubRef.current) { try { unsubRef.current(); } catch {} unsubRef.current = null; }
    streamIndexRef.current = -1;
    setBusy(false);
    
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
  setSessions,
  saveSessions,
  setMessages,
  streamIndexRef,
  setToolCalls,
  toolCalls,
  setHideToolCallIndicators,
  accumulatedText,
  setAccumulatedText,
  lastChunkRef,
  setBusy,
  runTimeoutRef,
  unsubRef,
  sawJsonRef
}) => {
  // Only if we haven't seen any json for this run; otherwise ignore raw stream to avoid duplication
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
    
    console.log('Parsed log line:', parsed);
    
    // Handle assistant messages - accumulate text content
    if (parsed.type === 'assistant' && parsed.message && parsed.message.content) {
      for (const content of parsed.message.content) {
        if (content.type === 'text' && content.text) {
          const newText = appendWithOverlap(accumulatedText, content.text, lastChunkRef.current);
          setAccumulatedText(newText);
          lastChunkRef.current = content.text;
          
          // Update the streaming message with accumulated text
          setMessages(m => {
            const idx = streamIndexRef.current;
            if (idx >= 0 && idx < m.length) {
              const updated = [...m];
              updated[idx] = { ...updated[idx], text: newText, isStreaming: true };
              return updated;
            }
            return m;
          });
          
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }
    }
    
    // Extract session ID from cursor-agent response and update session if needed
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
    
    // Handle tool calls (support multiple formats)
    if (parsed.type === 'tool_call' || parsed.type === 'tool' || parsed.type === 'function_call' || parsed.tool_call || parsed.tool || parsed.name === 'tool') {
      const { callId, toolCallData, subtype } = normalizeToolCallData(parsed);
      
      console.log('Tool call received (normalized):', { callId, subtype, toolCallData });
      
      // Store tool call info
      setToolCalls(prev => {
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
        
        console.log('Tool calls after update:', newMap.size);
        return newMap;
      });
    }
    
    // Stop streaming when we get a result (legacy path)
    if (parsed.type === 'result') {
      // Mark all active tool calls as completed
      setToolCalls(prev => {
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
      setHideToolCallIndicators(true);
      
      const finalText = typeof parsed.result === 'string' ? parsed.result : (parsed.output || accumulatedText || '');
      lastChunkRef.current = '';
      
      setMessages(m => {
        const idx = streamIndexRef.current;
        if (idx >= 0 && idx < m.length) {
          const updated = [...m];
          const toolCallsSnapshot = Array.from(toolCalls.entries()).map(([id, info]) => ({ id, ...info }));
          updated[idx] = { ...updated[idx], isStreaming: false };
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
      
      // Clean up streaming state and allow new input
      if (runTimeoutRef.current) { try { clearTimeout(runTimeoutRef.current); } catch {} runTimeoutRef.current = null; }
      if (unsubRef.current) { 
        try { unsubRef.current(); } catch {} 
        unsubRef.current = null; 
      }
      streamIndexRef.current = -1;
      setBusy(false);
      
      return true; // Signal completion
    }
    
  } catch (parseError) {
    // This line is not valid JSON - check if it's our end marker
    if (line.includes('123[*****END*****]123')) {
      return handleEndMarker({
        setToolCalls,
        setHideToolCallIndicators,
        setMessages,
        streamIndexRef,
        toolCalls,
        accumulatedText,
        setBusy,
        runTimeoutRef,
        unsubRef
      });
    }
    
    // Skip other lines that aren't valid JSON
    return false;
  }
  
  return false; // Not complete
};

/**
 * Handle end marker for legacy runners
 */
export const handleEndMarker = ({
  setToolCalls,
  setHideToolCallIndicators,
  setMessages,
  streamIndexRef,
  toolCalls,
  accumulatedText,
  setBusy,
  runTimeoutRef,
  unsubRef
}) => {
  // Mark all active tool calls as completed
  setToolCalls(prev => {
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
  setHideToolCallIndicators(true);
  
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
        const toolCallsSnapshot = Array.from(toolCalls.entries()).map(([id, info]) => ({ id, ...info }));
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
  setBusy(false);
  
  return true; // Signal completion
};

/**
 * Create the log stream subscription handler
 */
export const createLogStreamHandler = ({
  runId,
  currentSessionId,
  sessions,
  setSessions,
  saveSessions,
  setMessages,
  streamIndexRef,
  setToolCalls,
  toolCalls,
  setHideToolCallIndicators,
  accumulatedText,
  setAccumulatedText,
  lastChunkRef,
  setBusy,
  runTimeoutRef,
  unsubRef,
  sawJsonRef
}) => {
  return async (payload) => {
    if (!payload || payload.runId !== runId) {
      return;
    }
    
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
            setSessions,
            saveSessions,
            setMessages,
            streamIndexRef,
            setToolCalls,
            toolCalls,
            setHideToolCallIndicators,
            accumulatedText,
            setAccumulatedText,
            lastChunkRef,
            setBusy,
            runTimeoutRef,
            unsubRef,
            streamIndexRef
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
          setSessions,
          saveSessions,
          setMessages,
          streamIndexRef,
          setToolCalls,
          toolCalls,
          setHideToolCallIndicators,
          accumulatedText,
          setAccumulatedText,
          lastChunkRef,
          setBusy,
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
