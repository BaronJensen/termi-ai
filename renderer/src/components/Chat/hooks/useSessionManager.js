import { useState, useEffect, useCallback, useRef } from 'react';
import { useMessageHandler } from './useMessageHandler';

export const useSessionManager = (projectId) => {
  // Core session state
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  
  // Session-specific state maps
  const [busyBySession, setBusyBySession] = useState(new Map());
  const [toolCallsBySession, setToolCallsBySession] = useState(new Map());
  const [hideToolCallIndicatorsBySession, setHideToolCallIndicatorsBySession] = useState(new Map());
  const [terminalLogs, setTerminalLogs] = useState(new Map());
  const [showRawTerminal, setShowRawTerminal] = useState(new Map());
  
  // Track if we've already initialized to prevent overriding manual session selection
  const hasInitializedRef = useRef(false);

  // ===== STORAGE MANAGEMENT =====
  
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

  const saveSessions = useCallback((sessionsToSave) => {
    try {
      localStorage.setItem(`cursovable-sessions-${projectId || 'legacy'}`, JSON.stringify(sessionsToSave));
    } catch (error) {
      console.warn('Failed to save sessions to localStorage:', error);
    }
  }, [projectId]);

  // ===== SESSION STATE HELPERS =====
  
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

  // ===== SESSION MANAGEMENT =====
  
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
    
    // Validate parameters
    if (sessionId === cursorSessionId) {
      console.warn(`⚠️  WARNING: sessionId and cursorSessionId are the same: ${sessionId}`);
    }
    
    setSessions(prevSessions => {
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
      
      saveSessions(updatedSessions);
      return updatedSessions;
    });
  }, [sessions, currentSessionId, saveSessions]);

  // ===== MESSAGE HANDLING =====
  
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

  // ===== TERMINAL COMMUNICATION =====

  const handleCursorLog = useCallback((payload) => {
    console.log('🔍 SessionProvider received cursor log:', payload);
    
    // Route the log to the appropriate handler based on runId
    if (window.cursovableLogRouter) {
      window.cursovableLogRouter.routeLog(payload);
    }
    
    // Handle terminal logs for display
    if (payload && (payload.sessionId || payload.internalSessionId)) {
      let targetSessionId = null;
      
      // First try to use internalSessionId if available (most reliable)
      if (payload.internalSessionId) {
        targetSessionId = payload.internalSessionId;
      } else if (payload.sessionId) {
        // Check if this is a cursorSessionId that needs to be mapped to an internal sessionId
        const sessionWithCursorId = sessions.find(s => s.cursorSessionId === payload.sessionId);
        
        if (sessionWithCursorId) {
          targetSessionId = sessionWithCursorId.id;
        } else if (payload.sessionId.startsWith('temp-')) {
          // This is a temporary session ID from a new session, route to current session
          if (currentSessionId) {
            targetSessionId = currentSessionId;
          }
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
          return next;
        });
      }
    }
  }, [sessions, currentSessionId]);

  // ===== CURSOR COMMAND EXECUTION =====
  
  const send = useCallback(async (text, fullSessionObj) => {
    console.log(`🚀 SessionProvider.send called with text: "${text}" and session:`, fullSessionObj);
    
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
      
      saveSessions(updatedSessions);
      return updatedSessions;
    });
    
    // Mark session as busy
    setSessionBusy(sessionId, true);
    
    try {
      // Generate unique run ID for this command
      const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
      
      // Create session object for the runner
      const sessionObject = {
        id: sessionId,
        cursorSessionId: fullSessionObj.cursorSessionId || null,
        runId: runId,
        initiatedAt: Date.now()
      };
      
      // Register the session object in the log router
      if (window.cursovableLogRouter) {
        const messageHandler = createMessageHandler(runId, sessionId);
        window.cursovableLogRouter.registerHandler(runId, messageHandler, sessionObject);
      }
      
      // Call the cursor-agent CLI
      const result = await window.cursovable.runCursor({
        message: text,
        sessionId: sessionId,
        model: 'gpt-4',
        timeoutMs: 300000 // 5 minutes
      });
      
      console.log(`🚀 Cursor command completed for session: ${sessionId}, result:`, result);
      
    } catch (error) {
      console.error(`❌ Error running cursor command for session: ${sessionId}:`, error);
      
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
      
      // Clean up the handler after completion
      if (window.cursovableLogRouter) {
        window.cursovableLogRouter.unregisterHandler(runId);
      }
    }
  }, [sessions, saveSessions, setSessionBusy, updateSessionWithCursorId]);

  // Helper function to add messages to sessions
  const addMessageToSession = useCallback((sessionId, message) => {
    setSessions(prev => {
      const updated = prev.map(s => 
        s.id === sessionId 
          ? { ...s, messages: [...(s.messages || []), message], updatedAt: Date.now() }
          : s
      );
      saveSessions(updated);
      return updated;
    });
  }, [saveSessions]);



  // ===== INITIALIZATION =====
  
  useEffect(() => {
    // Only initialize once to prevent overriding manual session selection
    if (hasInitializedRef.current) {
      console.log('Sessions already initialized, skipping to preserve manual selection');
      return;
    }
    
    console.log(`Loading sessions for project: ${projectId || 'legacy'}`);
    const loadedSessions = loadSessions();
    
    setSessions(loadedSessions);
    
    if (loadedSessions.length > 0) {
      // Only set currentSessionId if it's not already set (to allow manual session switching)
      if (!currentSessionId) {
        // Load the most recent session
        const latestSession = loadedSessions.reduce((latest, session) => 
          session.updatedAt > latest.updatedAt ? session : latest
        );
        console.log(`Loading latest session: ${latestSession.name} (${latestSession.id})`);
        setCurrentSessionId(latestSession.id);
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
      createNewSession();
    }
    
    // Mark as initialized to prevent future overrides
    hasInitializedRef.current = true;
    console.log('Session initialization complete');
  }, [projectId, loadSessions, createNewSession, currentSessionId]);

  // ===== HOOK INITIALIZATIONS =====
  
  // Initialize the message handler hook
  const messageHandler = useMessageHandler(addMessageToSession, updateSessionWithCursorId);

  // ===== TERMINAL COMMUNICATION =====
  
  // Set up the centralized log router
  const setupLogRouter = useCallback(() => {
    // Only set up if window.cursovable is available (Electron environment)
    if (!window.cursovable?.onCursorLog) {
      console.log('window.cursovable.onCursorLog not available, skipping log router setup');
      return null;
    }

    // Create the centralized log router
    const logRouter = {
      handlers: new Map(), // runId -> handler function
      runToSessionMap: new Map(), // runId -> session object mapping
      
      registerHandler(runId, handler, sessionObject) {
        console.log(`🔧 Log router: registered handler for runId ${runId} with session:`, sessionObject);
        this.handlers.set(runId, handler);
        this.runToSessionMap.set(runId, sessionObject);
      },
      
      unregisterHandler(runId) {
        console.log(`🔧 Log router: unregistered handler for runId ${runId}`);
        this.handlers.delete(runId);
        this.runToSessionMap.delete(runId);
      },
      
      getCurrentRunSession(runId) {
        const sessionObject = this.runToSessionMap.get(runId);
        return sessionObject;
      },
      
      getCurrentRunSessionId(runId) {
        const sessionObject = this.runToSessionMap.get(runId);
        return sessionObject?.id;
      },
      
      routeLog(payload) {
        if (!payload || !payload.runId) {
          console.log('⚠️  Log router: payload missing runId, skipping');
          return;
        }
        
        const handler = this.handlers.get(payload.runId);
        if (handler) {
          try {
            handler(payload);
          } catch (error) {
            console.error(`❌ Log router: error in handler for runId ${payload.runId}:`, error);
          }
        } else {
          console.log(`⚠️  Log router: no handler found for runId ${payload.runId}`);
        }
      },
      
      debugState() {
        return {
          totalHandlers: this.handlers.size,
          registeredRunIds: Array.from(this.handlers.keys()),
          runToSessionMap: Array.from(this.runToSessionMap.entries()),
          sessions: sessions.map(s => ({ id: s.id, name: s.name, cursorSessionId: s.cursorSessionId })),
          currentSessionId
        };
      }
    };

    // Store the router globally
    window.cursovableLogRouter = logRouter;
    return logRouter;
  }, [sessions, currentSessionId]);

  // Clean up the log router
  const cleanupLogRouter = useCallback(() => {
    if (window.cursovableLogRouter) {
      window.cursovableLogRouter.handlers.clear();
      delete window.cursovableLogRouter;
    }
  }, []);

  // Get terminal status for a specific session
  const getSessionTerminalStatus = useCallback((sessionId) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return null;

    return {
      id: session.id,
      name: session.name,
      cursorSessionId: session.cursorSessionId,
      runningTerminal: session.runningTerminal || false,
      isActive: session.id === currentSessionId,
      hasCursorSession: !!session.cursorSessionId
    };
  }, [sessions, currentSessionId]);

  // Get terminal status for all sessions
  const getAllSessionsTerminalStatus = useCallback(() => {
    return sessions.map(session => getSessionTerminalStatus(session.id));
  }, [sessions, getSessionTerminalStatus]);

  // Get the current active terminal session
  const getCurrentTerminalSession = useCallback(() => {
    if (!currentSessionId) return null;
    return getSessionTerminalStatus(currentSessionId);
  }, [currentSessionId, getSessionTerminalStatus]);

  // Check if a session is currently running a terminal
  const isSessionRunningTerminal = useCallback((sessionId) => {
    const session = sessions.find(s => s.id === sessionId);
    return session?.runningTerminal || false;
  }, [sessions]);

  // Get cursor session ID for a given internal session
  const getCursorSessionId = useCallback((sessionId) => {
    const session = sessions.find(s => s.id === sessionId);
    return session?.cursorSessionId || null;
  }, [sessions]);

  // Get internal session ID for a given cursor session
  const getInternalSessionId = useCallback((cursorSessionId) => {
    const session = sessions.find(s => s.cursorSessionId === cursorSessionId);
    return session?.id || null;
  }, [sessions]);

  // Helper function to create message handlers for each run
  const createMessageHandler = useCallback((runId, sessionId) => {
    return (payload) => {
      if (payload && payload.line) {
        try {
          // Try to parse JSON logs
          if (payload.level === 'json') {
            const parsed = JSON.parse(payload.line);
            
            // Use the message handler hook to process the message
            messageHandler.handleParsedMessage(parsed, sessionId);
            
            // Handle tool calls separately (they need to update tool state)
            if (parsed.type === 'tool_call' && parsed.tool_calls) {
              console.log(`🔧 SessionProvider: Processing tool call for session ${sessionId}:`, parsed);
              
              // Update tool calls for this session
              setSessionToolCalls(sessionId, new Map([
                ...Array.from(getSessionToolCalls(sessionId)),
                [parsed.tool_calls[0]?.id || 'default', parsed]
              ]));
            }
          }
        } catch (error) {
          console.error(`🔧 SessionProvider: Error processing log for runId ${runId}:`, error);
        }
      }
    };
  }, [messageHandler, setSessionToolCalls, getSessionToolCalls]);

  // ===== RETURN VALUES =====
  
  return {
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
    saveSessions,
    
    // Terminal communication
    setupLogRouter,
    cleanupLogRouter,
    handleCursorLog,
    getSessionTerminalStatus,
    getAllSessionsTerminalStatus,
    getCurrentTerminalSession,
    isSessionRunningTerminal,
    getCursorSessionId,
    getInternalSessionId
  };
};
