import { useCallback } from 'react';

/**
 * Hook for handling different types of parsed messages from cursor sessions
 * 
 * This hook processes various message types and converts them into chat messages
 * that can be displayed in the UI. It handles session management, tool calls,
 * file operations, and other cursor agent activities.
 * 
 * @param {Function} addMessageToSession - Function to add messages to a session
 * @param {Function} updateSessionWithCursorId - Function to update session with cursor session ID
 * @returns {Object} Object with message handling functions
 */
export const useMessageHandler = (addMessageToSession, updateSessionWithCursorId) => {
  
  // Handle different types of parsed messages from cursor sessions
  const handleParsedMessage = useCallback((parsed, sessionId) => {
    console.log(`🔧 Processing message type '${parsed.type}' for session ${sessionId}:`, parsed);
    
    switch (parsed.type) {
      case 'session_start':
        handleSessionStart(parsed, sessionId);
        break;
        
      case 'assistant':
        handleAssistantMessage(parsed, sessionId);
        break;
        
      case 'result':
        handleResultMessage(parsed, sessionId);
        break;
        
      case 'tool_call':
        handleToolCall(parsed, sessionId);
        break;
        
      case 'tool_result':
        handleToolResult(parsed, sessionId);
        break;
        
      case 'session_end':
        handleSessionEnd(parsed, sessionId);
        break;
        
      case 'stream':
        handleStreamMessage(parsed, sessionId);
        break;
        
      case 'patch':
        handlePatchMessage(parsed, sessionId);
        break;
        
      case 'file_operation':
        handleFileOperation(parsed, sessionId);
        break;
        
      case 'command':
        handleCommandMessage(parsed, sessionId);
        break;
        
      case 'thinking':
        handleThinkingMessage(parsed, sessionId);
        break;
        
      case 'error':
        handleErrorMessage(parsed, sessionId);
        break;
        
      default:
        console.log(`🔧 Unhandled message type '${parsed.type}' for session ${sessionId}:`, parsed);
        break;
    }
  }, [addMessageToSession, updateSessionWithCursorId]);

  // Handle session start messages
  const handleSessionStart = useCallback((parsed, sessionId) => {
    if (parsed.session_id) {
      console.log(`🔧 Session started for session ${sessionId} with cursor session ID: ${parsed.session_id}`);
      updateSessionWithCursorId(sessionId, parsed.session_id);
    }
    
    // Add session start message
    const sessionStartMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      who: 'assistant',
      text: `Session started${parsed.message ? `: ${parsed.message}` : ''}`,
      timestamp: Date.now(),
      isSessionStart: true,
      rawData: parsed
    };
    
    addMessageToSession(sessionId, sessionStartMessage);
  }, [updateSessionWithCursorId, addMessageToSession]);

  // Handle assistant messages
  const handleAssistantMessage = useCallback((parsed, sessionId) => {
    if (parsed.message?.content?.[0]?.text) {
      const assistantMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
        who: 'assistant',
        text: parsed.message.content[0].text,
        timestamp: Date.now(),
        rawData: parsed
      };
      
      addMessageToSession(sessionId, assistantMessage);
    }
  }, [addMessageToSession]);

  // Handle result messages
  const handleResultMessage = useCallback((parsed, sessionId) => {
    const resultMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      who: 'assistant',
      text: parsed.result || 'Command completed',
      timestamp: Date.now(),
      isResult: true,
      rawData: parsed
    };
    
    addMessageToSession(sessionId, resultMessage);
  }, [addMessageToSession]);

  // Handle tool calls
  const handleToolCall = useCallback((parsed, sessionId) => {
    console.log(`🔧 Tool call for session ${sessionId}:`, parsed);
    
    if (parsed.tool_calls?.[0]) {
      const toolCallMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
        who: 'assistant',
        text: `Using tool: ${parsed.tool_calls[0].name || 'Unknown tool'}`,
        timestamp: Date.now(),
        isToolCall: true,
        rawData: parsed
      };
      
      addMessageToSession(sessionId, toolCallMessage);
    }
  }, [addMessageToSession]);

  // Handle tool results
  const handleToolResult = useCallback((parsed, sessionId) => {
    const toolResultMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      who: 'assistant',
      text: parsed.content?.[0]?.text || 'Tool execution completed',
      timestamp: Date.now(),
      isToolResult: true,
      rawData: parsed
    };
    
    addMessageToSession(sessionId, toolResultMessage);
  }, [addMessageToSession]);

  // Handle session end messages
  const handleSessionEnd = useCallback((parsed, sessionId) => {
    const sessionEndMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      who: 'assistant',
      text: `Session completed: ${parsed.message || 'Session ended'}`,
      timestamp: Date.now(),
      isSessionEnd: true,
      rawData: parsed
    };
    
    addMessageToSession(sessionId, sessionEndMessage);
  }, [addMessageToSession]);

  // Handle stream messages (raw text)
  const handleStreamMessage = useCallback((parsed, sessionId) => {
    if (parsed.content?.trim() && parsed.content.length > 10) {
      const streamMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
        who: 'assistant',
        text: parsed.content,
        timestamp: Date.now(),
        isStream: true,
        rawData: parsed
      };
      
      addMessageToSession(sessionId, streamMessage);
    }
  }, [addMessageToSession]);

  // Handle patch messages (file changes)
  const handlePatchMessage = useCallback((parsed, sessionId) => {
    const patchMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      who: 'assistant',
      text: `Updated file: ${parsed.file_path}`,
      timestamp: Date.now(),
      isPatch: true,
      rawData: parsed
    };
    
    addMessageToSession(sessionId, patchMessage);
  }, [addMessageToSession]);

  // Handle file operations
  const handleFileOperation = useCallback((parsed, sessionId) => {
    const fileOpMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      who: 'assistant',
      text: `File operation: ${parsed.operation} ${parsed.file_path || ''}`,
      timestamp: Date.now(),
      isFileOperation: true,
      rawData: parsed
    };
    
    addMessageToSession(sessionId, fileOpMessage);
  }, [addMessageToSession]);

  // Handle command execution
  const handleCommandMessage = useCallback((parsed, sessionId) => {
    const commandMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      who: 'assistant',
      text: `Executed command: ${parsed.command}`,
      timestamp: Date.now(),
      isCommand: true,
      rawData: parsed
    };
    
    addMessageToSession(sessionId, commandMessage);
  }, [addMessageToSession]);

  // Handle thinking messages
  const handleThinkingMessage = useCallback((parsed, sessionId) => {
    const thinkingMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      who: 'assistant',
      text: parsed.message || 'Thinking...',
      timestamp: Date.now(),
      isThinking: true,
      rawData: parsed
    };
    
    addMessageToSession(sessionId, thinkingMessage);
  }, [addMessageToSession]);

  // Handle error messages
  const handleErrorMessage = useCallback((parsed, sessionId) => {
    const errorMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      who: 'assistant',
      text: `Error: ${parsed.message || 'An error occurred'}`,
      timestamp: Date.now(),
      isError: true,
      rawData: parsed
    };
    
    addMessageToSession(sessionId, errorMessage);
  }, [addMessageToSession]);

  return {
    handleParsedMessage,
    // Individual handlers for specific use cases
    handleSessionStart,
    handleAssistantMessage,
    handleResultMessage,
    handleToolCall,
    handleToolResult,
    handleSessionEnd,
    handleStreamMessage,
    handlePatchMessage,
    handleFileOperation,
    handleCommandMessage,
    handleThinkingMessage,
    handleErrorMessage
  };
};
