import { useCallback } from 'react';
import { normalizeToolCallData } from './chatUtils';

/**
 * Hook for handling different types of parsed messages from cursor sessions
 * 
 * This hook processes various message types and converts them into chat messages
 * that can be displayed in the UI. It handles session management, tool calls,
 * file operations, and other cursor agent activities.
 * 
 * @param {Function} addMessageToSession - Function to add messages to a session
 * @param {Function} updateSessionWithCursorId - Function to update session with cursor session ID
 * @param {Function} setSessionToolCalls - Function to set tool calls for a session
 * @param {Function} setSessionHideToolCallIndicators - Function to hide tool call indicators
 * @param {Function} setSessionBusy - Function to set session busy state
 * @param {Function} setSessionStreamingText - Function to set streaming text for a session
 * @param {Object} toolCallsRef - Optional ref to store tool calls for final snapshot
 * @returns {Object} Object with message handling functions
 */
export const useMessageHandler = (
  addMessageToSession, 
  updateSessionWithCursorId,
  setSessionToolCalls,
  setSessionHideToolCallIndicators,
  setSessionBusy,
  setSessionStreamingText,
  toolCallsRef = null
) => {
  
  // Handle different types of parsed messages from cursor sessions
  const handleParsedMessage = useCallback((parsed, sessionId) => {
    console.log(`🔧 Processing message type '${parsed.type}' for session ${sessionId}:`, parsed);
    console.log(`🔧 Message keys:`, Object.keys(parsed));
    console.log(`🔧 Tool call indicators:`, {
      tool_call: !!parsed.tool_call,
      tool: !!parsed.tool,
      name: parsed.name,
      tool_calls: !!parsed.tool_calls
    });
    
    switch (parsed.type) {

      case 'system':
      case 'status':
        handleSystemMessage(parsed, sessionId);
        break;

      case 'assistant':
        handleAssistantMessage(parsed, sessionId);
        break;

      case 'result':
        handleResultMessage(parsed, sessionId);
        break;

      case 'tool_call':
      case 'tool':
      case 'function_call':
        console.log(`🔧 Handling tool call message for session ${sessionId}`);
        handleToolCall(parsed, sessionId);
        break;

      case 'tool_output':
      case 'tool_result':
        handleToolResult(parsed, sessionId);
        break;

      case 'reasoning':
        handleReasoningMessage(parsed, sessionId);
        break;

      case 'file_edit':
      case 'diff':
        handleFileEditMessage(parsed, sessionId);
        break;

      case 'streaming':
        handleStreamingDelta(parsed, sessionId);
        break;

      case 'error':
        handleErrorMessage(parsed, sessionId);
        break;

      default:
        // Check for tool call indicators in other message types
        if (parsed.tool_call || parsed.tool || parsed.name === 'tool') {
          handleToolCall(parsed, sessionId);
        } else {
          console.log(`🔧 Unhandled message type '${parsed.type}' for session ${sessionId}:`, parsed);
        }
        break;
    }
  }, [addMessageToSession, updateSessionWithCursorId, setSessionToolCalls, setSessionHideToolCallIndicators, setSessionBusy, setSessionStreamingText, toolCallsRef]);

  // Handle system messages (including init subtype for starting streaming)
  const handleSystemMessage = useCallback((parsed, sessionId) => {
    console.log(`🔧 System message for session ${sessionId}:`, parsed);
    
    // If this is an init message, start streaming text accumulation
    if (parsed.subtype === 'init') {
      console.log(`🔧 Starting streaming text accumulation for session ${sessionId}`);
      setSessionStreamingText(sessionId, '');
    }
  
  }, [addMessageToSession, setSessionStreamingText]);

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

  // Handle assistant messages with streaming text accumulation
  const handleAssistantMessage = useCallback((parsed, sessionId) => {
    console.log(`🔧 Assistant message for session ${sessionId}:`, parsed);
    
    if (parsed.message?.content?.[0]?.text) {
      const assistantContent = parsed.message.content[0].text;
      
      // Accumulate streaming text for this session
      setSessionStreamingText(sessionId, prev => {
        const newText = prev + assistantContent;
        console.log(`🔧 Accumulated streaming text for session ${sessionId}:`, newText.length, 'characters');
        return newText;
      });
      
    }
  }, [addMessageToSession, setSessionStreamingText]);

  // Handle result messages with comprehensive tool call completion and streaming cleanup
  const handleResultMessage = useCallback((parsed, sessionId) => {
    console.log(`🔧 Result message for session ${sessionId}:`, parsed);
    
    // Mark all tool calls as completed
    setSessionToolCalls(sessionId, prev => {
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
    
    // Hide tool call indicators
    setSessionHideToolCallIndicators(sessionId, true);
    
    // Set session as not busy
    setSessionBusy(sessionId, false);
    
    // Clear streaming text state for this session
    setSessionStreamingText(sessionId, '');
    
    const resultMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      who: 'assistant',
      text: parsed.result || 'Command completed',
      timestamp: Date.now(),
      isResult: true,
      rawData: parsed
    };
    
    addMessageToSession(sessionId, resultMessage);
  }, [addMessageToSession, setSessionToolCalls, setSessionHideToolCallIndicators, setSessionBusy, setSessionStreamingText]);

  // Handle tool calls with comprehensive state management
  const handleToolCall = useCallback((parsed, sessionId) => {
    console.log(`🔧 Tool call for session ${sessionId}:`, parsed);
    console.log(`🔧 Session ID type: ${typeof sessionId}, value: ${sessionId}`);
    console.log(`🔧 Tool call detection:`, {
      type: parsed.type,
      hasToolCalls: !!parsed.tool_calls,
      hasToolCall: !!parsed.tool_call,
      hasTool: !!parsed.tool,
      hasName: !!parsed.name,
      toolCallsLength: parsed.tool_calls?.length || 0
    });
    
    // Normalize tool call data (this function should be imported from chatUtils)
    const { callId, toolCallData, subtype } = normalizeToolCallData(parsed);
    console.log('Normalized tool call data:', { callId, toolCallData, subtype });
    
    if (callId) {
      console.log(`🔧 Setting tool call ${callId} for session ${sessionId}`);
      
      // Create tool call message to display in chat
      const toolCallMessage = {
        id: `tool-${callId}`,
        who: 'tool',
        text: `Running ${toolCallData.name || 'tool'}...`,
        timestamp: Date.now(),
        isToolCall: true,
        toolCallId: callId,
        toolCallData: toolCallData,
        toolCallSubtype: subtype,
        rawData: parsed
      };
      
      console.log(`🔧 Created tool call message:`, toolCallMessage);
      
      // Instead of adding a new message, replace any existing tool call message
      // This ensures only one tool call is displayed at a time
      addMessageToSession(sessionId, toolCallMessage, true); // true = replace existing tool calls
      
      console.log(`🔧 Replaced tool call message in session ${sessionId}`);
      
      // Update session tool calls state (for backward compatibility and state management)
      setSessionToolCalls(sessionId, prev => {
        console.log(`🔧 Previous tool calls for session ${sessionId}:`, prev);
        console.log(`🔧 Previous tool calls size:`, prev.size);
        console.log(`🔧 Previous tool calls entries:`, Array.from(prev.entries()));
        
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
        
        console.log(`🔧 New tool calls map for session ${sessionId}:`, newMap);
        console.log(`🔧 New tool calls size:`, newMap.size);
        console.log(`🔧 New tool calls entries:`, Array.from(newMap.entries()));
        return newMap;
      });
      
      // Also mirror into ref when available so final snapshot can include latest
      if (typeof window !== 'undefined' && window.requestAnimationFrame && toolCallsRef?.current) {
        try {
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
        } catch (error) {
          console.warn('Error updating tool calls ref:', error);
        }
      }
    }
  }, [addMessageToSession, setSessionToolCalls, toolCallsRef]);

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

  // Handle reasoning messages (from Codex)
  const handleReasoningMessage = useCallback((parsed, sessionId) => {
    const reasoningMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      who: 'assistant',
      text: parsed.text || 'Thinking...',
      timestamp: Date.now(),
      isReasoning: true,
      rawData: parsed
    };

    addMessageToSession(sessionId, reasoningMessage);
  }, [addMessageToSession]);

  // Handle streaming delta messages
  const handleStreamingDelta = useCallback((parsed, sessionId) => {
    // Accumulate streaming text for this session
    setSessionStreamingText(sessionId, prev => {
      const newText = prev + (parsed.text || '');
      return newText;
    });
  }, [setSessionStreamingText]);

  // Handle file edit messages (from Codex patch operations)
  const handleFileEditMessage = useCallback((parsed, sessionId) => {
    const fileEditMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      who: 'assistant',
      text: parsed.type === 'diff'
        ? `\`\`\`diff\n${parsed.text}\n\`\`\``
        : `File edit: ${parsed.success ? 'Success' : 'Failed'}\n${parsed.stdout || ''}`,
      timestamp: Date.now(),
      isFileEdit: true,
      rawData: parsed
    };

    addMessageToSession(sessionId, fileEditMessage);
  }, [addMessageToSession]);

  return {
    handleParsedMessage,
    // Individual handlers for specific use cases
    handleSystemMessage,
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
    handleErrorMessage,
    handleReasoningMessage,
    handleStreamingDelta,
    handleFileEditMessage
  };
};
