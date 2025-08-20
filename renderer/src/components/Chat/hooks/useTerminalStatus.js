import { useCallback, useRef } from 'react';

export const useTerminalStatus = (sessions, currentSessionId, updateSessionWithCursorId) => {
  const logRouterRef = useRef(null);

  // Set up the centralized log router for terminal communication
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
        console.log(`🔧 Log router: total handlers after registration:`, this.handlers.size);
        console.log(`🔧 Log router: all registered runIds:`, Array.from(this.handlers.keys()));
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

    // Store the router globally and in our ref
    window.cursovableLogRouter = logRouter;
    logRouterRef.current = logRouter;

    return logRouter;
  }, [sessions, currentSessionId]);

  // Handle cursor logs and route them appropriately
  const handleCursorLog = useCallback((payload) => {
    console.log('🔍 Terminal status: received cursor log:', payload);
    
    // Route the log to the appropriate handler based on runId
    if (logRouterRef.current) {
      logRouterRef.current.routeLog(payload);
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

  // Clean up the log router
  const cleanupLogRouter = useCallback(() => {
    if (logRouterRef.current) {
      logRouterRef.current.handlers.clear();
      logRouterRef.current = null;
    }
    if (window.cursovableLogRouter) {
      delete window.cursovableLogRouter;
    }
  }, []);

  return {
    // Router management
    setupLogRouter,
    cleanupLogRouter,
    
    // Log handling
    handleCursorLog,
    
    // Status queries
    getSessionTerminalStatus,
    getAllSessionsTerminalStatus,
    getCurrentTerminalSession,
    isSessionRunningTerminal,
    
    // Session ID mapping
    getCursorSessionId,
    getInternalSessionId,
    
    // Router reference for direct access if needed
    logRouter: logRouterRef.current
  };
};
