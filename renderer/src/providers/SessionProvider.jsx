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
      
      registerHandler(runId, handler) {
        console.log(`🔧 Log router: registered handler for runId ${runId}`);
        this.handlers.set(runId, handler);
      },
      
      unregisterHandler(runId) {
        console.log(`🔧 Log router: unregistered handler for runId ${runId}`);
        this.handlers.delete(runId);
      },
      
      routeLog(payload) {
        console.log(`🔧 Log router: routeLog called with payload:`, payload);
        
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
          sessions: sessions.map(s => ({ id: s.id, name: s.name, cursorSessionId: s.cursorSessionId }))
        });
      }
    };

    // Subscribe to the global log stream once
    const unsubscribe = window.cursovable.onCursorLog((payload) => {
      console.log('🔍 SessionProvider received cursor log:', payload);
      
      // Route the log to the appropriate handler based on runId
      if (window.cursovableLogRouter) {
        console.log(`🔧 SessionProvider routing log with runId: ${payload.runId}`);
        window.cursovableLogRouter.routeLog(payload);
      } else {
        console.log('⚠️  Log router not available for routing');
      }
      
      // Also handle terminal logs for display
      if (payload && payload.sessionId) {
        // Map cursorSessionId to internal sessionId
        let targetSessionId = payload.sessionId;
        
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
        console.log('⚠️  Cursor log payload missing sessionId:', payload);
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
      cursorSessionId: null
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

  const updateSessionWithCursorId = useCallback((sessionId, cursorSessionId) => {
    console.log(`🔄 updateSessionWithCursorId called with sessionId: ${sessionId}, cursorSessionId: ${cursorSessionId}`);
    console.log(`🔄 Current sessions:`, sessions.map(s => ({ id: s.id, name: s.name, cursorSessionId: s.cursorSessionId })));
    console.log(`🔄 Current session ID: ${currentSessionId}`);
    
    setSessions(prevSessions => {
      let updatedSessions = [...prevSessions];
      
      // If we have a sessionId, update the existing session
      if (sessionId) {
        const existingSession = prevSessions.find(s => s.id === sessionId);
        if (existingSession) {
          // Update the existing (possibly temporary) session with the real cursor session ID
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
        // If no sessionId provided, try to find a temporary session (one without cursorSessionId)
        const tempSession = prevSessions.find(s => !s.cursorSessionId);
        if (tempSession) {
          // Update the temporary session with the real cursor session ID
          updatedSessions = updatedSessions.map(session => 
            session.id === tempSession.id 
              ? { ...session, cursorSessionId, updatedAt: Date.now() }
              : session
          );
          console.log(`✅ Updated temporary session ${tempSession.id} with cursor session ID: ${cursorSessionId}`);
        } else {
          // If no temporary session exists, create a new session with the cursorSessionId
          const newSession = {
            id: `session-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
            name: 'New Session',
            messages: [],
            cursorSessionId,
            createdAt: Date.now(),
            updatedAt: Date.now()
          };
          updatedSessions.push(newSession);
          
          // Set this as the current session
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
      
      saveSessions(updatedSessions);
      console.log(`🔄 Sessions after update:`, updatedSessions.map(s => ({ id: s.id, name: s.name, cursorSessionId: s.cursorSessionId })));
      return updatedSessions;
    });
  }, [saveSessions, setCurrentSessionId, setToolCallsBySession, setHideToolCallIndicatorsBySession, setTerminalLogs, setShowRawTerminal]);

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
