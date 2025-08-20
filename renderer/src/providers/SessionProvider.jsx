import React, { createContext, useContext, useEffect } from 'react';
import { useSessionManager } from '../components/Chat/hooks/useSessionManager';
import { extractSessionIdFromJson, parseCursorLogPayload } from '../utils/sessionUtils';

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
    // Subscribe to the global log stream once
    if (window.cursovable?.onCursorLog) {
      const unsubscribe = window.cursovable.onCursorLog((payload) => {
        
        // Handle cursor logs (terminal output, etc.)
        sessionManager.handleCursorLog(payload);

        // Parse and handle JSON messages
        if (payload.level === 'json') {
          const parsedMessage = parseCursorLogPayload(payload);
          if (parsedMessage && payload.id) {
          // Use the message handler to process the parsed message
            sessionManager.messageHandler.handleParsedMessage(parsedMessage, payload.id);
          }
        }


        // Check if this payload contains a cursor session ID that we need to update
        let cursorSessionId = payload.cursorSessionId;
        let internalId = payload.id;
        
        // If this is a JSON message and we don't have a cursor session ID, try to extract it from the JSON
        if (payload.level === 'json' && !cursorSessionId && payload.line) {
          cursorSessionId = extractSessionIdFromJson(payload.line);
        }
        
        // Update the session if we have both IDs
        if (cursorSessionId && internalId) {          
          // Update the session with the cursor session ID
          sessionManager.updateSessionWithCursorId(internalId, cursorSessionId);
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
    }
  }, [sessionManager]);

  return (
    <SessionContext.Provider value={sessionManager}>
      {children}
    </SessionContext.Provider>
  );
};