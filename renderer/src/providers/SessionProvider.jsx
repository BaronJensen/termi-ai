import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const SessionContext = createContext();

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};

export const SessionProvider = ({ children, projectId }) => {
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [busyBySession, setBusyBySession] = useState(new Map());
  const [toolCallsBySession, setToolCallsBySession] = useState(new Map());
  const [hideToolCallIndicatorsBySession, setHideToolCallIndicatorsBySession] = useState(new Map());
  const [terminalLogs, setTerminalLogs] = useState(new Map());
  const [showRawTerminal, setShowRawTerminal] = useState(new Map());
  
  // Track if we've already initialized to prevent overriding manual session selection
  const hasInitializedRef = useRef(false);

  // Load sessions from localStorage
  const loadSessions = useCallback(() => {
    try {
      const storedSessions = localStorage.getItem(`cursovable-sessions-${projectId || 'legacy'}`);
      if (storedSessions) {
        const parsedSessions = JSON.parse(storedSessions);
        console.log(`🔍 loadSessions: Loaded ${parsedSessions.length} sessions from localStorage:`, 
          parsedSessions.map(s => ({ id: s.id, name: s.name, cursorSessionId: s.cursorSessionId })));
        return Array.isArray(parsedSessions) ? parsedSessions : [];
      }
    } catch (e) {
      console.warn('Failed to load sessions from localStorage:', e);
    }
    return [];
  }, [projectId]);

  // Save sessions to localStorage
  const saveSessions = useCallback((sessionsToSave) => {
    try {
      localStorage.setItem(`cursovable-sessions-${projectId || 'legacy'}`, JSON.stringify(sessionsToSave));
    } catch (error) {
      console.warn('Failed to save sessions to localStorage:', error);
    }
  }, [projectId]);



  // Centralized log router to prevent cross-contamination between sessions
  useEffect(() => {
    // Only set up if window.cursovable is available (Electron environment)
    if (!window.cursovable?.onCursorLog) {
      console.log('window.cursovable.onCursorLog not available, skipping log router setup');
      return;
    }

    // Create the centralized log router
    window.cursovableLogRouter = {
      handlers: new Map(), // runId -> handler function
      runToSessionMap: new Map(), // runId -> session object mapping
      
      registerHandler(runId, handler, sessionObject) {
        console.log(`🔧 Log router: registered handler for runId ${runId} with session:`, sessionObject);
        console.log(`🔧 Log router: handler function:`, typeof handler);
        this.handlers.set(runId, handler);
        this.runToSessionMap.set(runId, sessionObject);
        console.log(`🔧 Log router: total handlers after registration:`, this.handlers.size);
        console.log(`🔧 Log router: all registered runIds:`, Array.from(this.handlers.keys()));
        console.log(`🔧 Log router: run to session mapping:`, Array.from(this.runToSessionMap.entries()));
      },
      
      unregisterHandler(runId) {
        console.log(`🔧 Log router: unregistered handler for runId ${runId}`);
        this.handlers.delete(runId);
        this.runToSessionMap.delete(runId);
      },
      
      getCurrentRunSession(runId) {
        const sessionObject = this.runToSessionMap.get(runId);
        console.log(`🔧 Log router: getCurrentRunSession(${runId}) =`, sessionObject);
        return sessionObject;
      },
      
      getCurrentRunSessionId(runId) {
        const sessionObject = this.runToSessionMap.get(runId);
        const sessionId = sessionObject?.id;
        console.log(`🔧 Log router: getCurrentRunSessionId(${runId}) = ${sessionId}`);
        return sessionId;
      },
      
      routeLog(payload) {
        console.log(`🔧 Log router: routeLog called with payload:`, payload);
        console.log(`🔧 Log router: payload level: ${payload.level}, has line: ${!!payload.line}`);
        console.log(`🔧 Log router: payload line preview: ${payload.line?.substring(0, 200)}`);
        
        if (!payload || !payload.runId) {
          console.log('⚠️  Log router: payload missing runId, skipping');
          return;
        }
        
        const handler = this.handlers.get(payload.runId);
        if (handler) {
          console.log(`🔧 Log router: routing log to handler for runId ${payload.runId}`);
          try {
            handler(payload);
          } catch (error) {
            console.error(`❌ Log router: error in handler for runId ${payload.runId}:`, error);
          }
        } else {
          console.log(`⚠️  Log router: no handler found for runId ${payload.runId}, available handlers:`, Array.from(this.handlers.keys()));
        }
      },
      
      // Debug function to show current state
      debugState() {
        console.log('🔧 Log router debug state:', {
          totalHandlers: this.handlers.size,
          registeredRunIds: Array.from(this.handlers.keys()),
          runToSessionMap: Array.from(this.runToSessionMap.entries()),
          sessions: sessions.map(s => ({ id: s.id, name: s.name, cursorSessionId: s.cursorSessionId })),
          currentSessionId
        });
      },
      
      // Debug function to get current session state
      debugSessions() {
        const currentState = {
          sessions: sessions.map(s => ({ id: s.id, name: s.name, cursorSessionId: s.cursorSessionId })),
          currentSessionId,
          updateSessionWithCursorId: !!updateSessionWithCursorId,
          runToSessionMap: Array.from(this.runToSessionMap.entries())
        };
        console.log(`🔧 Log router: debugSessions called, returning:`, currentState);
        return currentState;
      }
    };

    // Subscribe to the global log stream once
    const unsubscribe = window.cursovable.onCursorLog((payload) => {
      console.log('🔍 SessionProvider received cursor log:', payload);
      
      // Route the log to the appropriate handler based on runId
      if (window.cursovableLogRouter) {
        console.log(`🔧 SessionProvider routing log with runId: ${payload.runId}`);
        console.log(`🔧 SessionProvider payload level: ${payload.level}, has line: ${!!payload.line}`);
        window.cursovableLogRouter.routeLog(payload);
      } else {
        console.log('⚠️  Log router not available for routing');
      }
      
      // Also handle terminal logs for display
      if (payload && (payload.sessionId || payload.internalSessionId)) {
        // Map cursorSessionId to internal sessionId
        let targetSessionId = null;
        
        // First try to use internalSessionId if available (most reliable)
        if (payload.internalSessionId) {
          targetSessionId = payload.internalSessionId;
          console.log(`✅ Using internalSessionId from payload: ${targetSessionId}`);
        } else if (payload.sessionId) {
          // Check if this is a cursorSessionId that needs to be mapped to an internal sessionId
          const sessionWithCursorId = sessions.find(s => s.cursorSessionId === payload.sessionId);
          console.log(`🔍 Looking for session with cursorSessionId: ${payload.sessionId}`);
          console.log(`🔍 Available sessions for mapping:`, sessions.map(s => ({ id: s.id, name: s.name, cursorSessionId: s.cursorSessionId })));
          
          if (sessionWithCursorId) {
            targetSessionId = sessionWithCursorId.id;
            console.log(`✅ Mapped cursor session ${payload.sessionId} to internal session ${targetSessionId}`);
          } else if (payload.sessionId.startsWith('temp-')) {
            // This is a temporary session ID from a new session, route to current session
            if (currentSessionId) {
              targetSessionId = currentSessionId;
              console.log(`🔄 Mapped temporary session ${payload.sessionId} to current session ${currentSessionId}`);
            } else {
              console.log(`⚠️  Temporary session ${payload.sessionId} but no currentSessionId`);
              return;
            }
          } else {
            console.log(`⚠️  No internal session found for cursor session ${payload.sessionId}`);
            console.log('Available sessions:', sessions.map(s => ({ id: s.id, cursorSessionId: s.cursorSessionId })));
            return;
          }
        }
        
        if (targetSessionId) {
          setTerminalLogs(prev => {
            const next = new Map(prev);
            const sessionLogs = next.get(targetSessionId) || { cursor: [] };

            const newLog = {
              ...payload,
              ts: Date.now(),
              tss: new Date().toLocaleTimeString()
            };

            const updatedLogs = {
              ...sessionLogs,
              cursor: [...sessionLogs.cursor, newLog]
            };

            next.set(targetSessionId, updatedLogs);
            console.log(`📝 Added log to session ${targetSessionId}, total logs: ${updatedLogs.cursor.length}`);
            return next;
          });
        } else {
          console.log(`⚠️  Could not determine target session for log payload:`, payload);
        }
      } else {
        console.log('⚠️  Cursor log payload missing sessionId and internalSessionId:', payload);
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
      // Clean up the global router
      if (window.cursovableLogRouter) {
        window.cursovableLogRouter.handlers.clear();
        delete window.cursovableLogRouter;
      }
    };
  }, [sessions, currentSessionId]);

  // Helper functions for managing busy state per session
  const isSessionBusy = useCallback((sessionId) => {
    return busyBySession.get(sessionId) || false;
  }, [busyBySession]);

  const setSessionBusy = useCallback((sessionId, busy) => {
    setBusyBySession(prev => {
      const next = new Map(prev);
      if (busy) {
        next.set(sessionId, true);
      } else {
        next.delete(sessionId);
      }
      return next;
    });
  }, []);

  const getCurrentSessionBusy = useCallback(() => {
    if (!currentSessionId) {
      console.warn('getCurrentSessionBusy called with null currentSessionId');
      return false;
    }
    return isSessionBusy(currentSessionId);
  }, [currentSessionId, isSessionBusy]);

  // Helper functions for managing tool calls per session
  const getSessionToolCalls = useCallback((sessionId) => {
    const toolCalls = toolCallsBySession.get(sessionId);
    return toolCalls instanceof Map ? toolCalls : new Map();
  }, [toolCallsBySession]);

  const setSessionToolCalls = useCallback((sessionId, toolCalls) => {
    setToolCallsBySession(prev => {
      const next = new Map(prev);
      next.set(sessionId, toolCalls);
      return next;
    });
  }, []);

  const getCurrentSessionToolCalls = useCallback(() => {
    if (!currentSessionId) {
      console.warn('getCurrentSessionToolCalls called with null currentSessionId');
      return new Map();
    }
    const toolCalls = getSessionToolCalls(currentSessionId);
    return toolCalls instanceof Map ? toolCalls : new Map();
  }, [currentSessionId, getSessionToolCalls]);

  // Helper functions for managing tool call indicators per session
  const getSessionHideToolCallIndicators = useCallback((sessionId) => {
    return hideToolCallIndicatorsBySession.get(sessionId) || false;
  }, [hideToolCallIndicatorsBySession]);

  const setSessionHideToolCallIndicators = useCallback((sessionId, hide) => {
    setHideToolCallIndicatorsBySession(prev => {
      const next = new Map(prev);
      next.set(sessionId, hide);
      return next;
    });
  }, []);

  const getCurrentSessionHideToolCallIndicators = useCallback(() => {
    if (!currentSessionId) {
      console.warn('getCurrentSessionHideToolCallIndicators called with null currentSessionId');
      return false;
    }
    return getSessionHideToolCallIndicators(currentSessionId);
  }, [currentSessionId, getSessionHideToolCallIndicators]);

  // Session management functions
  const createNewSession = useCallback((existingSessions = null) => {
    const currentSessions = existingSessions || sessions;
    const newSessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    const isFirstSession = currentSessions.length === 0;
    const newSession = {
      id: newSessionId,
      name: `Session ${new Date().toLocaleString()}`,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isFirstSession: isFirstSession,
      cursorSessionId: null,
      runningTerminal: false
    };
    
    const updatedSessions = [...currentSessions, newSession];
    setSessions(updatedSessions);
    saveSessions(updatedSessions);
    setCurrentSessionId(newSessionId);
    
    // Initialize state for new session
    setToolCallsBySession(prev => {
      const next = new Map(prev);
      next.set(newSessionId, new Map());
      return next;
    });
    setHideToolCallIndicatorsBySession(prev => {
      const next = new Map(prev);
      next.set(newSessionId, false);
      return next;
    });
    setTerminalLogs(prev => {
      const next = new Map(prev);
      next.set(newSessionId, { cursor: [] });
      return next;
    });
    setShowRawTerminal(prev => {
      const next = new Map(prev);
      next.set(newSessionId, false);
      return next;
    });
    
    console.log(`Created new session: ${newSessionId} (${newSession.name})`);
    return newSessionId;
  }, [sessions, saveSessions]);

  const loadSession = useCallback((sessionId) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      console.log(`Loading session ${sessionId} with ${session.messages?.length || 0} messages`);
      setCurrentSessionId(sessionId);
      console.log(`Switched to session ${sessionId} (other sessions remain active)`);
    } else {
      console.warn(`Session ${sessionId} not found in current sessions`);
    }
  }, [sessions]);

  const deleteSession = useCallback((sessionId) => {
    const updatedSessions = sessions.filter(s => s.id !== sessionId);
    setSessions(updatedSessions);
    saveSessions(updatedSessions);
    
    if (currentSessionId === sessionId) {
      if (updatedSessions.length > 0) {
        loadSession(updatedSessions[0].id);
      } else {
        createNewSession();
      }
    }
    
    // Clean up session state
    setToolCallsBySession(prev => {
      const next = new Map(prev);
      next.delete(sessionId);
      return next;
    });
    setHideToolCallIndicatorsBySession(prev => {
      const next = new Map(prev);
      next.delete(sessionId);
      return next;
    });
    setTerminalLogs(prev => {
      const next = new Map(prev);
      next.delete(sessionId);
      return next;
    });
    setShowRawTerminal(prev => {
      const next = new Map(prev);
      next.delete(sessionId);
      return next;
    });
  }, [sessions, currentSessionId, saveSessions, loadSession, createNewSession]);

  const markSessionRunningTerminal = useCallback((sessionId) => {
    console.log(`🔄 markSessionRunningTerminal called for session: ${sessionId}`);
    
    setSessions(prevSessions => {
      // Mark all sessions as not running terminal
      const updatedSessions = prevSessions.map(session => ({
        ...session,
        runningTerminal: false
      }));
      
      // Mark the specified session as running terminal
      const targetSession = updatedSessions.find(s => s.id === sessionId);
      if (targetSession) {
        targetSession.runningTerminal = true;
        console.log(`✅ Marked session ${sessionId} as running terminal`);
      } else {
        console.warn(`❌ Session ${sessionId} not found, cannot mark as running terminal`);
      }
      
      saveSessions(updatedSessions);
      return updatedSessions;
    });
  }, [saveSessions]);

  const updateSessionWithCursorId = useCallback((sessionId, cursorSessionId) => {
    console.log(`🔄 updateSessionWithCursorId called with sessionId: ${sessionId}, cursorSessionId: ${cursorSessionId}`);
    console.log(`🔄 Parameter types - sessionId: ${typeof sessionId}, cursorSessionId: ${typeof cursorSessionId}`);
    console.log(`🔄 Current sessions:`, sessions.map(s => ({ id: s.id, name: s.name, cursorSessionId: s.cursorSessionId, runningTerminal: s.runningTerminal })));
    console.log(`🔄 Current session ID: ${currentSessionId}`);
    
    // Validate parameters
    if (sessionId === cursorSessionId) {
      console.warn(`⚠️  WARNING: sessionId and cursorSessionId are the same: ${sessionId}`);
      console.warn(`⚠️  This suggests the internal session ID is being passed as the cursor session ID`);
    }
    
    setSessions(prevSessions => {
      console.log(`🔄 setSessions callback - prevSessions:`, prevSessions.map(s => ({ id: s.id, name: s.name, cursorSessionId: s.cursorSessionId, runningTerminal: s.runningTerminal })));
      let updatedSessions = [...prevSessions];
      
      if (sessionId) {
        // Update the specific session with the cursor session ID
        const existingSession = prevSessions.find(s => s.id === sessionId);
        if (existingSession) {
          updatedSessions = updatedSessions.map(session => 
            session.id === sessionId 
              ? { ...session, cursorSessionId, updatedAt: Date.now() }
              : session
          );
          console.log(`✅ Updated session ${sessionId} with cursor session ID: ${cursorSessionId}`);
        } else {
          console.warn(`❌ Session ${sessionId} not found, cannot update with cursor session ID`);
        }
      } else {
        // No sessionId provided - find the session running the terminal and update it
        const runningSession = prevSessions.find(s => s.runningTerminal);
        if (runningSession) {
          updatedSessions = updatedSessions.map(session => 
            session.id === runningSession.id 
              ? { ...session, cursorSessionId, updatedAt: Date.now() }
              : session
          );
          console.log(`✅ Updated running session ${runningSession.id} with cursor session ID: ${cursorSessionId}`);
        } else {
          // Fallback: update the current session
          const currentSession = prevSessions.find(s => s.id === currentSessionId);
          if (currentSession) {
            updatedSessions = updatedSessions.map(session => 
              session.id === currentSessionId 
                ? { ...session, cursorSessionId, updatedAt: Date.now() }
                : session
            );
            console.log(`✅ Updated current session ${currentSessionId} with cursor session ID: ${cursorSessionId}`);
          } else {
            // Create a new session if no suitable session found
            console.log(`🔄 Creating new session with cursor session ID: ${cursorSessionId}`);
            const newSession = {
              id: `session-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
              name: 'New Session',
              messages: [],
              cursorSessionId,
              runningTerminal: true,
              createdAt: Date.now(),
              updatedAt: Date.now()
            };
            updatedSessions.push(newSession);
            setCurrentSessionId(newSession.id);
            
            // Initialize state for the new session
            setToolCallsBySession(prev => {
              const next = new Map(prev);
              next.set(newSession.id, new Map());
              return next;
            });
            setHideToolCallIndicatorsBySession(prev => {
              const next = new Map(prev);
              next.set(newSession.id, false);
              return next;
            });
            setTerminalLogs(prev => {
              const next = new Map(prev);
              next.set(newSession.id, { cursor: [] });
              return next;
            });
            setShowRawTerminal(prev => {
              const next = new Map(prev);
              next.set(newSession.id, false);
              return next;
            });
            
            console.log(`Created new session ${newSession.id} with cursor session ID: ${cursorSessionId}`);
          }
        }
      }
      
      console.log(`🔄 About to save sessions:`, updatedSessions.map(s => ({ id: s.id, name: s.name, cursorSessionId: s.cursorSessionId, runningTerminal: s.runningTerminal })));
      saveSessions(updatedSessions);
      console.log(`🔄 Sessions after save:`, updatedSessions.map(s => ({ id: s.id, name: s.name, cursorSessionId: s.cursorSessionId, runningTerminal: s.runningTerminal })));
      
      return updatedSessions;
    });
  }, [sessions, currentSessionId, saveSessions, setCurrentSessionId, setToolCallsBySession, setHideToolCallIndicatorsBySession, setTerminalLogs, setShowRawTerminal]);

  // Centralized message sending function that works with any session
  const send = useCallback(async (text, fullSessionObj) => {
    console.log(`🚀 SessionProvider.send called with text: "${text}" and session:`, fullSessionObj);
    console.log(`🚀 Session object details:`, {
      id: fullSessionObj?.id,
      name: fullSessionObj?.name,
      cursorSessionId: fullSessionObj?.cursorSessionId,
      messagesCount: fullSessionObj?.messages?.length || 0
    });
    
    if (!fullSessionObj || !fullSessionObj.id) {
      console.error(`❌ Cannot send message: invalid session object`, fullSessionObj);
      return;
    }
    
    const sessionId = fullSessionObj.id;
    
    // Add user message to the session
    const userMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      who: 'user',
      text: text,
      timestamp: Date.now()
    };
    
    console.log(`📝 SessionProvider: Adding user message to session ${sessionId}:`, userMessage);
    
    setSessions(prevSessions => {
      const updatedSessions = prevSessions.map(session => 
        session.id === sessionId 
          ? { 
              ...session, 
              messages: [...(session.messages || []), userMessage],
              updatedAt: Date.now() 
            }
          : session
      );
      
      // Log the updated session
      const updatedSession = updatedSessions.find(s => s.id === sessionId);
      console.log(`📝 SessionProvider: Session ${sessionId} now has ${updatedSession?.messages?.length || 0} messages:`, 
        updatedSession?.messages?.map(m => ({ who: m.who, text: m.text?.substring(0, 50) })));
      
      saveSessions(updatedSessions);
      return updatedSessions;
    });
    
    // Mark session as busy
    setSessionBusy(sessionId, true);
    
    try {
      // Generate unique run ID for this command
      const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
      console.log(`🚀 Created runId: ${runId} for session: ${sessionId}`);
      
      // Create session object for the runner
      const sessionObject = {
        id: sessionId,
        cursorSessionId: fullSessionObj.cursorSessionId || null,
        runId: runId,
        initiatedAt: Date.now()
      };
      
      console.log(`🚀 Created session object for runner:`, sessionObject);
      console.log(`🚀 Original session object had cursorSessionId:`, fullSessionObj.cursorSessionId);
      
      // Register the session object in the log router
      if (window.cursovableLogRouter) {
        console.log(`🔧 SessionProvider: Registering session object for runId: ${runId} with session: ${sessionId}`);
        console.log(`🔧 SessionProvider: Log router state before registration:`, {
          totalHandlers: window.cursovableLogRouter.handlers.size,
          registeredRunIds: Array.from(window.cursovableLogRouter.handlers.keys())
        });
        
        // Create a simple message handler that can process logs for this run
        const messageHandler = (payload) => {
          console.log(`🔧 SessionProvider: Received log for runId ${runId}:`, payload);
          console.log(`🔧 SessionProvider: Payload level: ${payload.level}, has line: ${!!payload.line}`);
          console.log(`🔧 SessionProvider: Payload line preview: ${payload.line?.substring(0, 200)}`);
          
          // Process the log payload and update the session
          if (payload && payload.line) {
            try {
              // Try to parse JSON logs
              if (payload.level === 'json') {
                const parsed = JSON.parse(payload.line);
                console.log(`🔧 SessionProvider: Successfully parsed JSON for runId ${runId}:`, parsed);
                console.log(`🔧 SessionProvider: Message type: ${parsed.type}, session_id: ${parsed.session_id}`);
                
                // Handle session_id updates
                if (parsed.session_id && parsed.type === 'session_start') {
                  console.log(`🔧 SessionProvider: Updating session ${sessionId} with cursor session ID: ${parsed.session_id}`);
                  console.log(`🔧 SessionProvider: sessionId parameter: ${sessionId}, parsed.session_id: ${parsed.session_id}`);
                  console.log(`🔧 SessionProvider: Are they the same? ${sessionId === parsed.session_id}`);
                  updateSessionWithCursorId(sessionId, parsed.session_id);
                }
                
                // Handle assistant messages (including thinking messages)
                if (parsed.type === 'assistant' && parsed.message) {
                  const assistantMessage = {
                    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
                    who: 'assistant',
                    text: parsed.message.content?.[0]?.text || 'Assistant response',
                    timestamp: Date.now(),
                    rawData: parsed // Store raw data for debugging
                  };
                  
                  console.log(`📝 SessionProvider: Adding assistant message to session ${sessionId}:`, assistantMessage);
                  
                  setSessions(prev => {
                    const updated = prev.map(s => 
                      s.id === sessionId 
                        ? { ...s, messages: [...(s.messages || []), assistantMessage], updatedAt: Date.now() }
                        : s
                    );
                    saveSessions(updated);
                    return updated;
                  });
                }
                
                // Handle result messages
                if (parsed.type === 'result') {
                  const resultMessage = {
                    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
                    who: 'assistant',
                    text: parsed.result || 'Command completed',
                    timestamp: Date.now(),
                    isResult: true,
                    rawData: parsed
                  };
                  
                  console.log(`📝 SessionProvider: Adding result message to session ${sessionId}:`, resultMessage);
                  
                  setSessions(prev => {
                    const updated = prev.map(s => 
                      s.id === sessionId 
                        ? { ...s, messages: [...(s.messages || []), resultMessage], updatedAt: Date.now() }
                        : s
                    );
                    saveSessions(updated);
                    return updated;
                  });
                }
                
                // Handle tool calls
                if (parsed.type === 'tool_call' && parsed.tool_calls) {
                  console.log(`🔧 SessionProvider: Processing tool call for session ${sessionId}:`, parsed);
                  
                  // Update tool calls for this session
                  setSessionToolCalls(sessionId, new Map([
                    ...Array.from(getSessionToolCalls(sessionId)),
                    [parsed.tool_calls[0]?.id || 'default', parsed]
                  ]));
                }
                
                // Handle tool results
                if (parsed.type === 'tool_result') {
                  console.log(`🔧 SessionProvider: Processing tool result for session ${sessionId}:`, parsed);
                  
                  // Add tool result as a message
                  const toolResultMessage = {
                    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
                    who: 'assistant',
                    text: parsed.content?.[0]?.text || 'Tool execution completed',
                    timestamp: Date.now(),
                    isToolResult: true,
                    rawData: parsed
                  };
                  
                  setSessions(prev => {
                    const updated = prev.map(s => 
                      s.id === sessionId 
                        ? { ...s, messages: [...(s.messages || []), toolResultMessage], updatedAt: Date.now() }
                        : s
                    );
                    saveSessions(updated);
                    return updated;
                  });
                }
                
                // Handle session end
                if (parsed.type === 'session_end') {
                  console.log(`🔧 SessionProvider: Session ended for session ${sessionId}:`, parsed);
                  
                  const sessionEndMessage = {
                    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
                    who: 'assistant',
                    text: `Session completed: ${parsed.message || 'Session ended'}`,
                    timestamp: Date.now(),
                    isSessionEnd: true,
                    rawData: parsed
                  };
                  
                  setSessions(prev => {
                    const updated = prev.map(s => 
                      s.id === sessionId 
                        ? { ...s, messages: [...(s.messages || []), sessionEndMessage], updatedAt: Date.now() }
                        : s
                    );
                    saveSessions(updated);
                    return updated;
                  });
                }
                
                // Handle stream messages (raw text)
                if (parsed.type === 'stream' && parsed.content) {
                  console.log(`🔧 SessionProvider: Processing stream content for session ${sessionId}:`, parsed.content);
                  
                  // Add stream content as a message if it's substantial
                  if (parsed.content.trim() && parsed.content.length > 10) {
                    const streamMessage = {
                      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
                      who: 'assistant',
                      text: parsed.content,
                      timestamp: Date.now(),
                      isStream: true,
                      rawData: parsed
                    };
                    
                    setSessions(prev => {
                      const updated = prev.map(s => 
                        s.id === sessionId 
                          ? { ...s, messages: [...(s.messages || []), streamMessage], updatedAt: Date.now() }
                          : s
                      );
                      saveSessions(updated);
                      return updated;
                    });
                  }
                }
                
                // Handle patch messages (file changes)
                if (parsed.type === 'patch' && parsed.file_path) {
                  console.log(`🔧 SessionProvider: Processing patch for session ${sessionId}:`, parsed.file_path);
                  
                  const patchMessage = {
                    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
                    who: 'assistant',
                    text: `Updated file: ${parsed.file_path}`,
                    timestamp: Date.now(),
                    isPatch: true,
                    rawData: parsed
                  };
                  
                  setSessions(prev => {
                    const updated = prev.map(s => 
                      s.id === sessionId 
                        ? { ...s, messages: [...(s.messages || []), patchMessage], updatedAt: Date.now() }
                        : s
                    );
                    saveSessions(updated);
                    return updated;
                  });
                }
                
                // Handle file operations
                if (parsed.type === 'file_operation' && parsed.operation) {
                  console.log(`🔧 SessionProvider: Processing file operation for session ${sessionId}:`, parsed.operation);
                  
                  const fileOpMessage = {
                    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
                    who: 'assistant',
                    text: `File operation: ${parsed.operation} ${parsed.file_path || ''}`,
                    timestamp: Date.now(),
                    isFileOperation: true,
                    rawData: parsed
                  };
                  
                  setSessions(prev => {
                    const updated = prev.map(s => 
                      s.id === sessionId 
                        ? { ...s, messages: [...(s.messages || []), fileOpMessage], updatedAt: Date.now() }
                        : s
                    );
                    saveSessions(updated);
                    return updated;
                  });
                }
                
                // Handle command execution
                if (parsed.type === 'command' && parsed.command) {
                  console.log(`🔧 SessionProvider: Processing command execution for session ${sessionId}:`, parsed.command);
                  
                  const commandMessage = {
                    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
                    who: 'assistant',
                    text: `Executed command: ${parsed.command}`,
                    timestamp: Date.now(),
                    isCommand: true,
                    rawData: parsed
                  };
                  
                  setSessions(prev => {
                    const updated = prev.map(s => 
                      s.id === sessionId 
                        ? { ...s, messages: [...(s.messages || []), commandMessage], updatedAt: Date.now() }
                        : s
                    );
                    saveSessions(updated);
                    return updated;
                  });
                }
                
                // Log any unhandled message types for debugging
                if (!['session_start', 'assistant', 'result', 'tool_call', 'tool_result', 'session_end', 'stream', 'patch', 'file_operation', 'command'].includes(parsed.type)) {
                  console.log(`🔧 SessionProvider: Unhandled message type '${parsed.type}' for session ${sessionId}:`, parsed);
                }
              }
            } catch (error) {
              console.error(`🔧 SessionProvider: Error processing log for runId ${runId}:`, error);
            }
          }
        };
        
        window.cursovableLogRouter.registerHandler(runId, messageHandler, sessionObject);
        console.log(`🔧 SessionProvider: After registration - total handlers:`, window.cursovableLogRouter.handlers.size);
        console.log(`🔧 SessionProvider: All registered runIds:`, Array.from(window.cursovableLogRouter.handlers.keys()));
      } else {
        console.warn(`⚠️  SessionProvider: Log router not available for runId: ${runId}`);
      }
      
      // Call the cursor-agent CLI
      const result = await window.cursovable.runCursor({
        message: text,
        sessionId: sessionId,
        model: 'gpt-4',
        timeoutMs: 300000 // 5 minutes
      });
      
      console.log(`🚀 Cursor command completed for session: ${sessionId}, result:`, result);
      
      // Clean up the handler after completion
      if (window.cursovableLogRouter) {
        window.cursovableLogRouter.unregisterHandler(runId);
        console.log(`🔧 Unregistered handler for runId: ${runId}`);
      }
      
    } catch (error) {
      console.error(`❌ Error running cursor command for session: ${sessionId}:`, error);
      
      // Clean up the handler on error
      if (window.cursovableLogRouter) {
        window.cursovableLogRouter.unregisterHandler(runId);
        console.log(`🔧 Unregistered handler for runId: ${runId} due to error`);
      }
      
      // Add error message to the session
      const errorMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
        who: 'assistant',
        text: `Error: ${error.message}`,
        timestamp: Date.now(),
        isError: true
      };
      
      setSessions(prevSessions => {
        const updatedSessions = prevSessions.map(session => 
          session.id === sessionId 
            ? { 
                ...session, 
                messages: [...(session.messages || []), errorMessage],
                updatedAt: Date.now() 
              }
            : session
        );
        saveSessions(updatedSessions);
        return updatedSessions;
      });
    } finally {
      // Mark session as not busy
      setSessionBusy(sessionId, false);
    }
  }, [sessions, saveSessions, setSessionBusy, updateSessionWithCursorId]);

  // Derive a session name from the first user message
  const deriveSessionNameFromMessage = useCallback((text) => {
    if (!text || typeof text !== 'string') return 'Untitled';
    // Trim, collapse whitespace, strip newlines
    let name = text.trim().replace(/\s+/g, ' ');
    // Remove markdown code fences/backticks that could bloat UI
    name = name.replace(/`{1,3}/g, '');
    // Limit length to avoid breaking UI
    const maxLen = 60;
    if (name.length > maxLen) name = name.slice(0, maxLen - 1) + '…';
    return name || 'Untitled';
  }, []);

  const saveCurrentSession = useCallback((messages) => {
    if (!currentSessionId) {
      console.warn('No current session ID, cannot save');
      return;
    }
    
    setSessions(prevSessions => {
      const updatedSessions = prevSessions.map(session => 
        session.id === currentSessionId 
          ? { 
              ...session, 
              // Keep name (possibly set from first message); only derive name if still default
              name: session.name && session.name.startsWith('Session ')
                ? (messages.find(msg => msg.who === 'user')
                    ? deriveSessionNameFromMessage(messages.find(msg => msg.who === 'user').text)
                    : session.name)
                : session.name,
              messages, 
              updatedAt: Date.now() 
            }
          : session
      );
      saveSessions(updatedSessions);
      return updatedSessions;
    });
  }, [currentSessionId, saveSessions, deriveSessionNameFromMessage]);

  // Initialize sessions on mount (after all functions are defined)
  useEffect(() => {
    // Only initialize once to prevent overriding manual session selection
    if (hasInitializedRef.current) {
      console.log('Sessions already initialized, skipping to preserve manual selection');
      return;
    }
    
    console.log(`Loading sessions for project: ${projectId || 'legacy'}`);
    const loadedSessions = loadSessions();
    console.log(`Found ${loadedSessions.length} existing sessions:`, loadedSessions.map(s => ({id: s.id, name: s.name, messageCount: s.messages?.length || 0})));
    
    setSessions(loadedSessions);
    
    if (loadedSessions.length > 0) {
      // Only set currentSessionId if it's not already set (to allow manual session switching)
      if (!currentSessionId) {
        // Load the most recent session
        const latestSession = loadedSessions.reduce((latest, session) => 
          session.updatedAt > latest.updatedAt ? session : latest
        );
        console.log(`Loading latest session: ${latestSession.name} (${latestSession.id}) with ${latestSession.messages?.length || 0} messages`);
        setCurrentSessionId(latestSession.id);
      } else {
        console.log(`Keeping current session: ${currentSessionId} (manual selection preserved)`);
      }
      
      // Initialize state for all sessions
      loadedSessions.forEach(session => {
        setToolCallsBySession(prev => {
          const next = new Map(prev);
          next.set(session.id, new Map());
          return next;
        });
        setHideToolCallIndicatorsBySession(prev => {
          const next = new Map(prev);
          next.set(session.id, false);
          return next;
        });
        setTerminalLogs(prev => {
          const next = new Map(prev);
          next.set(session.id, { cursor: [] });
          return next;
        });
        setShowRawTerminal(prev => {
          const next = new Map(prev);
          next.set(session.id, false);
          return next;
        });
      });
    } else {
      // Create a temporary session immediately for better UX
      console.log('No existing sessions found, creating temporary session');
      const newSessionId = createNewSession();
      console.log('Created temporary session:', newSessionId);
    }
    
    // Mark as initialized to prevent future overrides
    hasInitializedRef.current = true;
    console.log('Session initialization complete');
  }, [projectId, loadSessions, createNewSession]);

  const value = {
    // State
    sessions,
    currentSessionId,
    busyBySession,
    toolCallsBySession,
    hideToolCallIndicatorsBySession,
    terminalLogs,
    showRawTerminal,
    
    // Actions
    setCurrentSessionId,
    setSessionBusy,
    setSessionToolCalls,
    setSessionHideToolCallIndicators,
    setShowRawTerminal,
    
    // Helper functions
    isSessionBusy,
    getCurrentSessionBusy,
    getSessionToolCalls,
    getCurrentSessionToolCalls,
    getSessionHideToolCallIndicators,
    getCurrentSessionHideToolCallIndicators,
    
    // Session management
    createNewSession,
    loadSession,
    deleteSession,
    updateSessionWithCursorId,
    saveCurrentSession,
    markSessionRunningTerminal,
    
    // Message handling
    send,
    
    // Utility functions
    deriveSessionNameFromMessage,
    
    // Storage
    loadSessions,
    saveSessions
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
};