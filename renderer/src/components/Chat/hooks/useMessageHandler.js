import { useCallback } from 'react';
import { parserRegistry, MessageType, shouldDisplayMessage } from '../../../lib/providers';

/**
 * Hook for handling different types of parsed messages from AI agent sessions
 *
 * This hook processes messages from all AI providers (Cursor, Claude, Codex)
 * using a unified message format system. Provider-specific parsing is delegated
 * to dedicated parsers, keeping this handler clean and maintainable.
 *
 * @param {Function} addMessageToSession - Function to add messages to a session
 * @param {Function} updateSessionWithCursorId - Function to update session with provider session ID
 * @param {Function} setSessionToolCalls - Function to set tool calls for a session
 * @param {Function} setSessionHideToolCallIndicators - Function to hide tool call indicators
 * @param {Function} setSessionBusy - Function to set session busy state
 * @param {Function} setSessionStreamingText - Function to set streaming text for a session
 * @param {Function} removeToolCallMessages - Function to remove all tool call messages from a session
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
  removeToolCallMessages,
  toolCallsRef = null
) => {

  /**
   * Main entry point - parses raw provider message and handles it
   */
  const handleParsedMessage = useCallback((rawMessage, sessionId, provider = 'cursor') => {
    console.log(`🎯 [handleParsedMessage] ENTRY:`, {
      provider,
      messageType: rawMessage.type,
      sessionId: sessionId?.slice(0, 8)
    });

    // Parse message using provider-specific parser
    const unifiedMessage = parserRegistry.parse(rawMessage, provider);

    if (!unifiedMessage) {
      console.warn(`[MessageHandler] Failed to parse message from ${provider}:`, rawMessage);
      return;
    }

    console.log(`🎯 [handleParsedMessage] PARSED:`, {
      inputProvider: provider,
      unifiedProvider: unifiedMessage.provider,
      messageType: unifiedMessage.type,
      match: provider === unifiedMessage.provider
    });

    console.log(`[MessageHandler] ${provider.toUpperCase()} → ${unifiedMessage.type}:`, unifiedMessage.data);

    // Handle the unified message by type
    handleUnifiedMessage(unifiedMessage, sessionId);
  }, []);

  /**
   * Handle a unified message based on its type
   */
  const handleUnifiedMessage = useCallback((message, sessionId) => {
    const { type, data, metadata, provider } = message;

    switch (type) {
      case MessageType.SYSTEM:
        handleSystemMessage(message, sessionId);
        break;

      case MessageType.STATUS:
        handleStatusMessage(message, sessionId);
        break;

      case MessageType.ASSISTANT:
        handleAssistantMessage(message, sessionId);
        break;

      case MessageType.REASONING:
        handleReasoningMessage(message, sessionId);
        break;

      case MessageType.RESULT:
        handleResultMessage(message, sessionId);
        break;

      case MessageType.TOOL_CALL:
        handleToolCall(message, sessionId);
        break;

      case MessageType.TOOL_OUTPUT:
        handleToolOutput(message, sessionId);
        break;

      case MessageType.TOOL_RESULT:
        handleToolResult(message, sessionId);
        break;

      case MessageType.STREAMING_DELTA:
        handleStreamingDelta(message, sessionId);
        break;

      case MessageType.SESSION_START:
        handleSessionStart(message, sessionId);
        break;

      case MessageType.SESSION_END:
        handleSessionEnd(message, sessionId);
        break;

      case MessageType.USER_PROMPT:
        handleUserPrompt(message, sessionId);
        break;

      case MessageType.ERROR:
        handleErrorMessage(message, sessionId);
        break;

      case MessageType.METADATA:
        handleMetadata(message, sessionId);
        break;

      case MessageType.CONFIG:
        // Config messages from Codex signal process start
        if (metadata?.isStart) {
          console.log(`[MessageHandler] CONFIG with isStart - triggering loading for session ${sessionId}`);
          setSessionBusy(sessionId, true);
          setSessionStreamingText(sessionId, '');
        }
        console.log(`[MessageHandler] Hidden message type ${type} (${provider})`);
        break;

      case MessageType.FILE_EDIT:
      case MessageType.DIFF:
      case MessageType.STREAMING_START:
      case MessageType.STREAMING_END:
        // Hidden message types - don't display
        console.log(`[MessageHandler] Hidden message type ${type} (${provider})`);
        break;

      default:
        console.warn(`[MessageHandler] Unhandled message type: ${type}`, message);
        break;
    }
  }, [addMessageToSession, updateSessionWithCursorId, setSessionToolCalls, setSessionHideToolCallIndicators, setSessionBusy, setSessionStreamingText, removeToolCallMessages, toolCallsRef]);

  // ===== MESSAGE TYPE HANDLERS =====

  const handleSystemMessage = useCallback((message, sessionId) => {
    const { data } = message;

    // Init subtype starts loading state
    if (data.subtype === 'init') {
      console.log(`[MessageHandler] Process starting for session ${sessionId}`);
      setSessionBusy(sessionId, true);
      setSessionStreamingText(sessionId, '');
    }

    // Display system message if it has text
    if (data.text && shouldDisplayMessage(message)) {
      addMessageToSession(sessionId, {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
        who: 'system',
        text: data.text,
        timestamp: message.timestamp,
        provider: message.provider,
        rawData: message.raw
      });
    }
  }, [setSessionBusy, setSessionStreamingText, addMessageToSession]);

  const handleStatusMessage = useCallback((message, sessionId) => {
    const { data } = message;

    const shouldDisplay = shouldDisplayMessage(message);
    console.log(`🔍 [handleStatusMessage] Should display?`, {
      text: data.text,
      shouldDisplay,
      hidden: message.metadata?.hidden,
      type: message.type
    });

    if (data.text && shouldDisplay) {
      addMessageToSession(sessionId, {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
        who: 'system',
        text: data.text,
        timestamp: message.timestamp,
        provider: message.provider,
        rawData: message.raw
      });
    }
  }, [addMessageToSession]);

  const handleAssistantMessage = useCallback((message, sessionId) => {
    const { data, metadata } = message;

    console.log(`🎯 [handleAssistantMessage] Creating message with provider:`, message.provider);

    // Claude streaming format: isStreaming flag indicates streaming content
    if (data.isStreaming && data.text) {
      console.log(`[MessageHandler] ${message.provider} complete message for session ${sessionId}`);

      const newMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
        who: 'assistant',
        text: data.text,
        timestamp: message.timestamp,
        provider: message.provider,
        rawData: message.raw
      };

      console.log(`🎯 [handleAssistantMessage] Adding message to session:`, {
        provider: newMessage.provider,
        messageId: newMessage.id
      });

      addMessageToSession(sessionId, newMessage);

      // Clear streaming text since we have full message
      setSessionStreamingText(sessionId, '');
    }
    // Final completion message
    else if (data.text && data.isFinal) {
      const newMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
        who: 'assistant',
        text: data.text,
        timestamp: message.timestamp,
        provider: message.provider,
        rawData: message.raw
      };

      console.log(`🎯 [handleAssistantMessage] Final message - Adding to session:`, {
        provider: newMessage.provider,
        messageId: newMessage.id
      });

      addMessageToSession(sessionId, newMessage);

      // Codex: assistant message signals completion
      if (metadata.isComplete) {
        console.log(`[MessageHandler] Process complete for session ${sessionId}`);
        setSessionBusy(sessionId, false);
        setSessionStreamingText(sessionId, '');
        setSessionHideToolCallIndicators(sessionId, true);
        removeToolCallMessages(sessionId);
      }
    }
  }, [addMessageToSession, setSessionStreamingText, setSessionBusy, setSessionHideToolCallIndicators, removeToolCallMessages]);

  const handleReasoningMessage = useCallback((message, sessionId) => {
    const { data } = message;

    console.log(`[MessageHandler] Reasoning for session ${sessionId}: ${data.text}`);

    // Show reasoning as temporary streaming text
    if (data.isTemporary) {
      setSessionStreamingText(sessionId, data.text || 'Thinking...');
    } else {
      // Permanent reasoning message
      addMessageToSession(sessionId, {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
        who: 'assistant',
        text: data.text,
        timestamp: message.timestamp,
        isReasoning: true,
        provider: message.provider,
        rawData: message.raw
      });
    }
  }, [setSessionStreamingText, addMessageToSession]);

  const handleResultMessage = useCallback((message, sessionId) => {
    const { data } = message;

    console.log(`[MessageHandler] Result for session ${sessionId}`);

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

    // Hide tool call indicators and stop busy state
    setSessionHideToolCallIndicators(sessionId, true);
    setSessionBusy(sessionId, false);
    removeToolCallMessages(sessionId);

    // Display result text
    if (data.text && data.text.trim().length > 0) {
      addMessageToSession(sessionId, {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
        who: 'assistant',
        text: data.text,
        timestamp: message.timestamp,
        isResult: true,
        provider: message.provider,
        rawData: message.raw
      });
    }

    // Clear streaming text
    setSessionStreamingText(sessionId, '');
  }, [addMessageToSession, setSessionToolCalls, setSessionHideToolCallIndicators, setSessionBusy, setSessionStreamingText, removeToolCallMessages]);

  const handleToolCall = useCallback((message, sessionId) => {
    const { data } = message;

    console.log(`[MessageHandler] Tool call ${data.id} (${data.name}) for session ${sessionId}`);

    // Create tool call message
    const toolCallMessage = {
      id: `tool-${data.id}`,
      who: 'tool',
      text: `Running ${data.name}...`,
      timestamp: message.timestamp,
      isToolCall: true,
      toolCallId: data.id,
      toolCallData: {
        id: data.id,
        name: data.name,
        args: data.args
      },
      toolCallSubtype: data.status,
      provider: message.provider,
      rawData: message.raw
    };

    // Replace existing tool call message (one at a time)
    addMessageToSession(sessionId, toolCallMessage, true);

    // Update tool calls state
    setSessionToolCalls(sessionId, prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(data.id);

      const toolCallInfo = {
        toolCall: data,
        isCompleted: data.status === 'completed',
        isStarted: data.status === 'started',
        startedAt: existing?.startedAt || Date.now(),
        completedAt: data.status === 'completed' ? Date.now() : existing?.completedAt,
        rawData: message.raw,
        lastUpdated: Date.now()
      };

      newMap.set(data.id, toolCallInfo);

      // Mirror to ref if available
      if (toolCallsRef?.current) {
        toolCallsRef.current.set(data.id, toolCallInfo);
      }

      return newMap;
    });
  }, [addMessageToSession, setSessionToolCalls, toolCallsRef]);

  const handleToolOutput = useCallback((message, sessionId) => {
    const { data } = message;

    // Tool output is typically hidden (too noisy)
    // Just log it for debugging
    console.log(`[MessageHandler] Tool output for ${data.id}: ${data.text?.slice(0, 50)}...`);
  }, []);

  const handleToolResult = useCallback((message, sessionId) => {
    const { data, metadata } = message;

    console.log(`[MessageHandler] Tool result for ${data.id}`);

    // Update tool call state
    setSessionToolCalls(sessionId, prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(data.id);

      if (existing) {
        newMap.set(data.id, {
          ...existing,
          isCompleted: true,
          completedAt: Date.now(),
          lastUpdated: Date.now()
        });
      }

      return newMap;
    });

    // Update message to show completed status
    if (metadata.isComplete) {
      const toolCall = toolCallsRef?.current?.get(data.id) || { toolCall: { name: 'tool' } };

      const completedMessage = {
        id: `tool-${data.id}`,
        who: 'tool',
        text: `Running ${toolCall.toolCall.name}...`,
        timestamp: message.timestamp,
        isToolCall: true,
        toolCallId: data.id,
        toolCallData: toolCall.toolCall,
        toolCallSubtype: 'completed',
        provider: message.provider,
        rawData: message.raw
      };

      addMessageToSession(sessionId, completedMessage, true);
    }

    // Display tool result text if meaningful
    if (data.text && data.text.trim().length > 0 && shouldDisplayMessage(message)) {
      addMessageToSession(sessionId, {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
        who: 'assistant',
        text: data.text,
        timestamp: message.timestamp,
        isToolResult: true,
        provider: message.provider,
        rawData: message.raw
      });
    }
  }, [addMessageToSession, setSessionToolCalls, toolCallsRef]);

  const handleStreamingDelta = useCallback((message, sessionId) => {
    const { data } = message;

    // Accumulate streaming text
    setSessionStreamingText(sessionId, prev => prev + (data.text || ''));
  }, [setSessionStreamingText]);

  const handleSessionStart = useCallback((message, sessionId) => {
    const { data } = message;

    if (data.sessionId) {
      console.log(`[MessageHandler] Session started with ID: ${data.sessionId}`);
      updateSessionWithCursorId(sessionId, data.sessionId);
    }

    if (data.text && shouldDisplayMessage(message)) {
      addMessageToSession(sessionId, {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
        who: 'system',
        text: data.text,
        timestamp: message.timestamp,
        isSessionStart: true,
        provider: message.provider,
        rawData: message.raw
      });
    }
  }, [updateSessionWithCursorId, addMessageToSession]);

  const handleSessionEnd = useCallback((message, sessionId) => {
    const { data } = message;

    if (data.text && shouldDisplayMessage(message)) {
      addMessageToSession(sessionId, {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
        who: 'system',
        text: data.text,
        timestamp: message.timestamp,
        isSessionEnd: true,
        provider: message.provider,
        rawData: message.raw
      });
    }
  }, [addMessageToSession]);

  const handleUserPrompt = useCallback((message, sessionId) => {
    const { metadata } = message;

    // Codex prompt message starts loading
    if (metadata.isStart) {
      console.log(`[MessageHandler] User prompt received, starting loading for session ${sessionId}`);
      setSessionBusy(sessionId, true);
      setSessionStreamingText(sessionId, '');
    }
  }, [setSessionBusy, setSessionStreamingText]);

  const handleErrorMessage = useCallback((message, sessionId) => {
    const { data } = message;

    addMessageToSession(sessionId, {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      who: 'system',
      text: `Error: ${data.text}`,
      timestamp: message.timestamp,
      isError: true,
      provider: message.provider,
      rawData: message.raw
    });

    // Stop loading on error
    setSessionBusy(sessionId, false);
  }, [addMessageToSession, setSessionBusy]);

  const handleMetadata = useCallback((message, sessionId) => {
    const { data } = message;

    // Log metadata but don't display
    console.log(`[MessageHandler] Metadata for session ${sessionId}:`, data);
  }, []);

  return {
    handleParsedMessage,
    handleUnifiedMessage,
    // Individual handlers exported for specific use cases
    handleSystemMessage,
    handleStatusMessage,
    handleAssistantMessage,
    handleReasoningMessage,
    handleResultMessage,
    handleToolCall,
    handleToolOutput,
    handleToolResult,
    handleStreamingDelta,
    handleSessionStart,
    handleSessionEnd,
    handleUserPrompt,
    handleErrorMessage,
    handleMetadata
  };
};
