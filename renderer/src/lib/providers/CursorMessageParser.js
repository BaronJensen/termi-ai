/**
 * Cursor AI Message Parser
 *
 * Transforms Cursor Agent JSON output into unified message format
 */

import { MessageType, createUnifiedMessage } from './messageFormat.js';

export class CursorMessageParser {
  /**
   * Parse a Cursor message into unified format
   *
   * @param {Object} rawMessage - Raw message from Cursor Agent
   * @returns {Object|null} Unified message or null if should be ignored
   */
  parse(rawMessage) {
    const { type } = rawMessage;

    if (!type) {
      console.warn('[CursorParser] Message without type:', rawMessage);
      return null;
    }

    switch (type) {
      // Status
      case 'status':
      case 'system':
        return this.parseStatus(rawMessage);

      // Session management
      case 'session_start':
        return this.parseSessionStart(rawMessage);

      case 'session_end':
        return this.parseSessionEnd(rawMessage);

      // Assistant message
      case 'assistant':
        return this.parseAssistant(rawMessage);

      // Result (final completion)
      case 'result':
        return this.parseResult(rawMessage);

      // Tool execution
      case 'tool_call':
      case 'tool':
      case 'function_call':
        return this.parseToolCall(rawMessage);

      case 'tool_output':
      case 'tool_result':
        return this.parseToolResult(rawMessage);

      // Streaming
      case 'streaming':
        return this.parseStreaming(rawMessage);

      case 'streaming_start':
        return this.parseStreamingStart(rawMessage);

      case 'streaming_end':
        return this.parseStreamingEnd(rawMessage);

      // Error
      case 'error':
        return this.parseError(rawMessage);

      // Metadata
      case 'metadata':
        return this.parseMetadata(rawMessage);

      default:
        // Check for tool call indicators in other message types
        if (rawMessage.tool_call || rawMessage.tool || rawMessage.name === 'tool') {
          return this.parseToolCall(rawMessage);
        }

        console.warn('[CursorParser] Unknown message type:', type, rawMessage);
        return createUnifiedMessage(
          MessageType.UNKNOWN,
          'cursor',
          { text: JSON.stringify(rawMessage) },
          { hidden: true },
          rawMessage
        );
    }
  }

  parseStatus(msg) {
    return createUnifiedMessage(
      msg.subtype === 'init' ? MessageType.SYSTEM : MessageType.STATUS,
      'cursor',
      {
        text: msg.text || msg.message || '',
        subtype: msg.subtype,
        sessionId: msg.session_id
      },
      {
        // Hide initialization messages (used for loading state only)
        hidden: msg.subtype === 'init'
      },
      msg
    );
  }

  parseSessionStart(msg) {
    return createUnifiedMessage(
      MessageType.SESSION_START,
      'cursor',
      {
        sessionId: msg.session_id,
        text: msg.message || 'Session started'
      },
      { hidden: true }, // Hide session start messages
      msg
    );
  }

  parseSessionEnd(msg) {
    return createUnifiedMessage(
      MessageType.SESSION_END,
      'cursor',
      {
        text: msg.message || 'Session ended'
      },
      { hidden: true }, // Hide session end messages
      msg
    );
  }

  parseAssistant(msg) {
    return createUnifiedMessage(
      MessageType.ASSISTANT,
      'cursor',
      {
        text: msg.text || msg.content || '',
        model: msg.model,
        isStreaming: msg.isStreaming === true,
        isFinal: msg.isStreaming !== true
      },
      {
        sessionId: msg.session_id
      },
      msg
    );
  }

  parseResult(msg) {
    return createUnifiedMessage(
      MessageType.RESULT,
      'cursor',
      {
        text: msg.result || msg.text || '',
        success: msg.success !== false
      },
      {},
      msg
    );
  }

  parseToolCall(msg) {
    // Extract tool call data from various formats
    let toolCallId, toolName, toolArgs;

    if (msg.tool_calls && Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) {
      const toolCall = msg.tool_calls[0];
      toolCallId = toolCall.id;
      toolName = toolCall.name || toolCall.function?.name;
      toolArgs = toolCall.args || toolCall.function?.arguments || {};
    } else if (msg.tool_call) {
      toolCallId = msg.tool_call.id || msg.id;
      toolName = msg.tool_call.name;
      toolArgs = msg.tool_call.args || {};
    } else if (msg.tool) {
      toolCallId = msg.tool.id || msg.id;
      toolName = msg.tool.name;
      toolArgs = msg.tool.args || {};
    } else {
      toolCallId = msg.id;
      toolName = msg.name || msg.function?.name;
      toolArgs = msg.args || msg.arguments || msg.function?.arguments || {};
    }

    return createUnifiedMessage(
      MessageType.TOOL_CALL,
      'cursor',
      {
        id: toolCallId,
        name: toolName,
        args: toolArgs,
        status: msg.subtype === 'completed' || msg.subtype === 'end' ? 'completed' : 'started'
      },
      {
        subtype: msg.subtype
      },
      msg
    );
  }

  parseToolResult(msg) {
    return createUnifiedMessage(
      MessageType.TOOL_RESULT,
      'cursor',
      {
        id: msg.call_id || msg.id,
        text: msg.content?.[0]?.text || msg.result || msg.output || '',
        success: !msg.error
      },
      {
        isComplete: msg.type === 'tool_result'
      },
      msg
    );
  }

  parseStreaming(msg) {
    return createUnifiedMessage(
      MessageType.STREAMING_DELTA,
      'cursor',
      {
        text: msg.text || msg.delta || '',
        index: msg.index
      },
      {},
      msg
    );
  }

  parseStreamingStart(msg) {
    return createUnifiedMessage(
      MessageType.STREAMING_START,
      'cursor',
      {
        index: msg.index
      },
      { hidden: true },
      msg
    );
  }

  parseStreamingEnd(msg) {
    return createUnifiedMessage(
      MessageType.STREAMING_END,
      'cursor',
      {
        index: msg.index
      },
      { hidden: true },
      msg
    );
  }

  parseError(msg) {
    return createUnifiedMessage(
      MessageType.ERROR,
      'cursor',
      {
        text: msg.message || msg.error || 'An error occurred'
      },
      {},
      msg
    );
  }

  parseMetadata(msg) {
    return createUnifiedMessage(
      MessageType.METADATA,
      'cursor',
      {
        tokens: msg.tokens
      },
      { hidden: true },
      msg
    );
  }
}
