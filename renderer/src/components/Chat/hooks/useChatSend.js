import { useRef, useCallback } from 'react';
import { loadSettings } from '../../../store/settings';

export function useChatSend({
  // State setters
  setMessages,
  setBusy,
  setToolCalls,
  setHideToolCallIndicators,
  setSessions,
  
  // State values
  input,
  setInput,
  busy,
  cwd,
  model,
  sessions,
  currentSessionId,
  toolCalls,
  
  // Functions
  deriveSessionNameFromMessage,
  getSessionStorageKey,
  saveSessions,
  checkTerminalStatus,
  
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

  const send = useCallback(async (textOverride) => {
    const text = (typeof textOverride === 'string' ? textOverride : input).trim();
    if (!text) return;
    
    // Check if working directory is selected
    if (!cwd) {
      alert('Please select a working directory first using the "Change" button above.');
      return;
    }
    
    // Check if already busy
    if (busy) {
      console.warn('Already processing a request, ignoring new input');
      return;
    }

    // Security check: ensure process working directory matches the project folder
    try {
      const normalizePath = (p) => (p || '').replace(/\\/g, '/').replace(/\/+$/,'');
      const desiredCwd = normalizePath(cwd);
      let currentWd = normalizePath(await window.cursovable.getWorkingDirectory());
      if (!currentWd || currentWd !== desiredCwd) {
        const proceed = confirm(
          `Security check: Current working directory is "${currentWd || '(none)'}" but project folder is "${desiredCwd}".\n\nSwitch to the project folder before running commands?`
        );
        if (!proceed) return;
        await window.cursovable.setWorkingDirectory(desiredCwd);
        currentWd = normalizePath(await window.cursovable.getWorkingDirectory());
        if (currentWd !== desiredCwd) {
          alert('Failed to switch working directory to the project folder. Aborting to keep your environment safe.');
          return;
        }
      }
    } catch (err) {
      alert(`Could not verify working directory: ${err?.message || String(err)}. Aborting to stay safe.`);
      return;
    }
    
    if (typeof textOverride !== 'string') setInput('');
    // Reset textarea height
    const textarea = document.querySelector('.input textarea');
    if (textarea) {
      textarea.style.height = '64px';
    }
    
    // Reset tool call indicator visibility for new conversation
    setHideToolCallIndicators(false);
    
    // Add user message
    setMessages(m => {
      const next = [...m, { who: 'user', text, rawData: { command: text, timestamp: Date.now() } }];
      // If this is the first user message in this session, set the session name from it
      if (currentSessionId) {
        const hasUserBefore = m.some(msg => msg.who === 'user');
        if (!hasUserBefore) {
          const newName = deriveSessionNameFromMessage(text);
          setSessions(prev => {
            const updated = prev.map(s => s.id === currentSessionId ? { ...s, name: newName } : s);
            // Persist immediately so the header updates survive reloads
            try { localStorage.setItem(getSessionStorageKey(), JSON.stringify(updated)); } catch {}
            return updated;
          });
        }
      }
      return next;
    });
    setBusy(true);
    
    try {
      // Prepare streaming message and subscribe to logs for this run
      const runId = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
      runIdRef.current = runId;
      // Reset any previous local timeout and start a new one for this run
      if (runTimeoutRef.current) { try { clearTimeout(runTimeoutRef.current); } catch {} runTimeoutRef.current = null; }
      
      // Create streaming assistant message
      let streamIdx;
      setMessages(m => {
        streamIdx = m.length;
        streamIndexRef.current = streamIdx;
        return [...m, { who: 'assistant', text: '', isStreaming: true, rawData: null }];
      });
      
      // Track accumulated assistant text
      let accumulatedText = '';
      lastChunkRef.current = '';
      sawJsonRef.current = false;

      // Start a local timeout aligned with settings
      try {
        const { cursorAgentTimeoutMs } = loadSettings();
        const ms = typeof cursorAgentTimeoutMs === 'number' && cursorAgentTimeoutMs > 0 ? cursorAgentTimeoutMs : 900000;
        runTimeoutRef.current = setTimeout(() => {
          // Only act if this run is still the active one
          if (runIdRef.current !== runId) return;
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
        }, ms);
      } catch {}
      
      // Helpers to sanitize noisy terminal lines before JSON parse
      const stripAnsiAndControls = (input) => {
        try {
          return String(input || '')
            .replace(/\x1B\[[0-?]*[ -\/]*[@-~]/g, '')
            .replace(/\u001b\[[0-9;]*[A-Za-z]/g, '')
            .replace(/\x1b\[[0-9;]*[A-Za-z]/g, '')
            .replace(/\[[0-9;]*m/g, '')
            .replace(/\r(?!\n)/g, '\n')
            .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '');
        } catch { return String(input || ''); }
      };
      
      const extractJsonCandidate = (line) => {
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

      // Helper to append with overlap-dedup to avoid repeated fragments
      const appendWithOverlap = (base, chunk) => {
        if (!chunk) return base;
        if (lastChunkRef.current && lastChunkRef.current === chunk) return base;
        lastChunkRef.current = chunk;
        const maxOverlap = Math.min(base.length, chunk.length, 2000);
        for (let k = maxOverlap; k > 0; k--) {
          if (base.endsWith(chunk.slice(0, k))) {
            return base + chunk.slice(k);
          }
        }
        return base + chunk;
      };

      // Subscribe to log stream for this run
      unsubRef.current = window.cursovable.onCursorLog(async (payload) => {
        if (!payload || payload.runId !== runIdRef.current) {
          return;
        }
        
        try {
          // Prefer clean JSON emitted by the runner; ignore non-JSON stream lines to avoid duplicates
          if (payload.level === 'json') {
            sawJsonRef.current = true;
            const parsed = JSON.parse(String(payload.line || ''));
            const lines = [parsed];
            for (const parsed of lines) {
              try {
                console.log('Parsed log line:', parsed);
                
                // Handle assistant messages - accumulate text content
                if (parsed.type === 'assistant' && parsed.message && parsed.message.content) {
                  for (const content of parsed.message.content) {
                    if (content.type === 'text' && content.text) {
                      accumulatedText = appendWithOverlap(accumulatedText, content.text);
                      setMessages(m => {
                        const idx = streamIndexRef.current;
                        if (idx >= 0 && idx < m.length) {
                          const updated = [...m];
                          updated[idx] = { ...updated[idx], text: accumulatedText, isStreaming: true };
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
                    callId = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
                  }
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
                  if (runTimeoutRef.current) { try { clearTimeout(runTimeoutRef.current); } catch {} runTimeoutRef.current = null; }
                  if (unsubRef.current) { try { unsubRef.current(); } catch {} unsubRef.current = null; }
                  streamIndexRef.current = -1;
                  runIdRef.current = null;
                  setBusy(false);
                  return;
                }
              } catch (parseError) {
                // ignore individual bad parses in json-mode
              }
            }
            return;
          }

          // Fallback: parse stream lines (older runner)
          // Only if we haven't seen any json for this run; otherwise ignore raw stream to avoid duplication
          if (sawJsonRef.current) {
            return;
          }
          const sanitized = stripAnsiAndControls(payload.line);
          const lines = sanitized.split('\n').filter(line => line.trim());
          for (const line of lines) {
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
                    accumulatedText = appendWithOverlap(accumulatedText, content.text);
                    
                    // Update the streaming message with accumulated text
                    setMessages(m => {
                      const idx = streamIndexRef.current;
                      if (idx >= 0 && idx < m.length) {
                        const updated = [...m];
                        updated[idx] = { ...updated[idx], text: accumulatedText, isStreaming: true };
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
                // Update the current session with the session ID from cursor-agent
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
                let callId = parsed.call_id || parsed.id;
                let toolCallData = parsed.tool_call;
                let subtype = parsed.subtype || parsed.status || (parsed.result ? 'completed' : (parsed.args ? 'started' : 'update'));

                // Normalize when tool_call isn't in expected shape
                if (!toolCallData) {
                  const name = (parsed.tool && (parsed.tool.name || parsed.tool.tool || parsed.tool.type)) || parsed.name || 'tool';
                  const args = (parsed.tool && (parsed.tool.args || parsed.tool.parameters)) || parsed.args || {};
                  const result = parsed.result;
                  const key = `${String(name).replace(/\s+/g, '')}ToolCall`;
                  toolCallData = { [key]: { args, ...(result !== undefined ? { result } : {}) } };
                }
                if (!callId) {
                  callId = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
                }

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
                runIdRef.current = null;
                setBusy(false);
                
                return;
              }
            } catch (parseError) {
              // This line is not valid JSON - check if it's our end marker
              if (line.includes('123[*****END*****]123')) {
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
                runIdRef.current = null;
                setBusy(false);
                
                return;
              }
              
              // Skip other lines that aren't valid JSON
              continue;
            }
          }
        } catch (error) {
          console.error('Error processing log line:', error);
        }
      });

      // Use cursor-agent session ID if available, otherwise use our internal session ID
      const currentSession = sessions.find(s => s.id === currentSessionId);
      const sessionIdToUse = currentSession?.cursorSessionId || currentSessionId;

      const { cursorAgentTimeoutMs } = loadSettings();
      // Print the current terminal folder in the cursor debug log before running
      try {
        const currentWd = await window.cursovable.getWorkingDirectory();
        await window.cursovable.cursorDebugLog({ line: `[cursor-agent] Working directory: ${currentWd || '(none)'}`, runId });
      } catch {}

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
        if (runTimeoutRef.current) { try { clearTimeout(runTimeoutRef.current); } catch {} runTimeoutRef.current = null; }
        if (unsubRef.current) { 
          try { unsubRef.current(); } catch {} 
          unsubRef.current = null; 
        }
        streamIndexRef.current = -1;
        runIdRef.current = null;
        setBusy(false);
      }
    } catch (e) {
      // Check if it's a terminal-related error
      let errorMessage = e.message || String(e);
      if (errorMessage.includes('timeout') || errorMessage.includes('idle')) {
        errorMessage = `**Terminal timeout detected:** ${errorMessage}\n\nThis usually means the cursor-agent process hung or is waiting for input. Try:\n\n1. **Force Cleanup** button above to kill stuck processes\n2. Check if cursor-agent needs interactive input\n3. Restart the application if the issue persists`;
      } else if (errorMessage.includes('cursor-agent')) {
        errorMessage = `**Cursor agent error:** ${errorMessage}\n\nCheck if cursor-agent is properly installed and accessible.`;
      } else if (errorMessage.includes('SIGTERM') || errorMessage.includes('killed')) {
        errorMessage = `**Process terminated:** ${errorMessage}\n\nThis usually means the process was killed due to timeout or cleanup. This is normal behavior.`;
      }
      
      // Render error in the streaming bubble if available
      setMessages(m => {
        const idx = streamIndexRef.current;
        const text = errorMessage;
        if (idx >= 0 && idx < m.length) {
          const updated = [...m];
          updated[idx] = { who: 'assistant', text, isStreaming: false, rawData: { error: errorMessage } };
          return updated;
        }
        return [...m, { who: 'assistant', text, isStreaming: false, rawData: { error: errorMessage } }];
      });
      
      // Update terminal status after error
      await checkTerminalStatus();
    } finally {
      // Clean up streaming state
      if (runTimeoutRef.current) { try { clearTimeout(runTimeoutRef.current); } catch {} runTimeoutRef.current = null; }
      if (unsubRef.current) { try { unsubRef.current(); } catch {} unsubRef.current = null; }
      streamIndexRef.current = -1;
      runIdRef.current = null;
      setBusy(false);
    }
  }, [
    input, setInput, busy, cwd, model, sessions, currentSessionId, toolCalls,
    setMessages, setBusy, setToolCalls, setHideToolCallIndicators, setSessions,
    deriveSessionNameFromMessage, getSessionStorageKey, saveSessions, checkTerminalStatus
  ]);

  // Return the send function and cleanup function
  return {
    send,
    cleanup: () => {
      if (unsubRef.current) { try { unsubRef.current(); } catch {} unsubRef.current = null; }
      if (runTimeoutRef.current) { try { clearTimeout(runTimeoutRef.current); } catch {} runTimeoutRef.current = null; }
      streamIndexRef.current = -1;
      runIdRef.current = null;
    }
  };
}
