import React, { createContext, useContext, useEffect } from 'react';
import { useSessionManager } from '../components/Chat/hooks/useSessionManager';

const SessionContext = createContext();

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};

export const SessionProvider = ({ children, projectId }) => {
  // Use the custom hook to manage all session logic
  const sessionManager = useSessionManager(projectId);
  
  // Set up the log router and cursor log handling
  useEffect(() => {
    // Set up the centralized log router
    const logRouter = sessionManager.setupLogRouter();
    
    // Subscribe to the global log stream once
    if (window.cursovable?.onCursorLog) {
      const unsubscribe = window.cursovable.onCursorLog((payload) => {
        sessionManager.handleCursorLog(payload);
      });
      
      return () => {
        if (unsubscribe) unsubscribe();
        // Clean up the global router
        if (window.cursovableLogRouter) {
          window.cursovableLogRouter.handlers.clear();
          delete window.cursovableLogRouter;
        }
      };
    }
  }, [sessionManager]);

  return (
    <SessionContext.Provider value={sessionManager}>
      {children}
    </SessionContext.Provider>
  );
};