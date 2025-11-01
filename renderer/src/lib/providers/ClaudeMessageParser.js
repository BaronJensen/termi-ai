/**
 * Claude Code Message Parser
 *
 * Transforms Claude Code CLI JSON output into unified message format
 */

import { MessageType, createUnifiedMessage } from './messageFormat.js';

export class ClaudeMessageParser {
  /**
   * Parse a Claude Code message into unified format
   *
   * @param {Object} rawMessage - Raw message from Claude Code CLI
   * @returns {Object|null} Unified message or null if should be ignored
   */
  parse(rawMessage) {
    // Handle stream_event wrapper
    if (rawMessage.type === 'stream_event' && rawMessage.event) {
      return this.parse(rawMessage.event);
    }

    const { type } = rawMessage;

    switch (type) {
      // System initialization and status messages
      // Note: Backend transforms 'system' with subtype 'init' to 'status' with subtype 'init'
      case 'system':
        return this.parseSystem(rawMessage);

      case 'status':
        // Status messages with 'init' subtype should trigger loading state
        if (rawMessage.subtype === 'init') {
          return this.parseSystem(rawMessage);
        }
        return this.parseStatus(rawMessage);

      // Assistant messages
      case 'assistant':
        return this.parseAssistant(rawMessage);

      // Tool use
      case 'tool_use':
        return this.parseToolUse(rawMessage);

      case 'tool_result':
        return this.parseToolResult(rawMessage);

      // Result (final completion)
      case 'result':
        return this.parseResult(rawMessage);

      // Streaming events
      case 'content_block_start':
        return this.parseStreamingStart(rawMessage);

      case 'content_block_delta':
        return this.parseStreamingDelta(rawMessage);

      case 'content_block_stop':
        return this.parseStreamingEnd(rawMessage);

      // Session management
      case 'message_start':
        return this.parseSessionStart(rawMessage);

      case 'message_stop':
        return this.parseSessionEnd(rawMessage);

      // Error
      case 'error':
        return this.parseError(rawMessage);

      default:
        console.warn('[ClaudeParser] Unknown message type:', type, rawMessage);
        return createUnifiedMessage(
          MessageType.UNKNOWN,
          'claude',
          { text: JSON.stringify(rawMessage) },
          { hidden: true },
          rawMessage
        );
    }
  }

  parseSystem(msg) {
    return createUnifiedMessage(
      MessageType.SYSTEM,
      'claude',
      {
        text: msg.text || 'Claude Code initialized',
        subtype: msg.subtype,
        sessionId: msg.session_id
      },
      {
        model: msg.model,
        tools: msg.tools,
        // Hide initialization messages (used for loading state only)
        hidden: msg.subtype === 'init'
      },
      msg
    );
  }

  parseStatus(msg) {
    return createUnifiedMessage(
      MessageType.STATUS,
      'claude',
      {
        text: msg.text || '',
        subtype: msg.subtype
      },
      {},
      msg
    );
  }

  parseAssistant(msg) {
    const content = msg.message?.content || [];
    const textContent = content.find(c => c.type === 'text');

    return createUnifiedMessage(
      MessageType.ASSISTANT,
      'claude',
      {
        text: textContent?.text || msg.text || '',
        model: msg.message?.model || msg.model,
        isStreaming: msg.isStreaming === true,
        isFinal: msg.isStreaming !== true
      },
      {
        sessionId: msg.session_id
      },
      msg
    );
  }

  parseToolUse(msg) {
    return createUnifiedMessage(
      MessageType.TOOL_CALL,
      'claude',
      {
        id: msg.tool_use_id,
        name: msg.tool_name || msg.name,
        args: msg.arguments || msg.input || {},
        status: 'started'
      },
      {
        sessionId: msg.session_id
      },
      msg
    );
  }

  parseToolResult(msg) {
    const content = msg.content?.[0];
    const resultText = content?.text || msg.result || '';

    return createUnifiedMessage(
      MessageType.TOOL_RESULT,
      'claude',
      {
        id: msg.tool_use_id,
        text: resultText,
        success: !msg.error
      },
      {
        sessionId: msg.session_id,
        hidden: !resultText || resultText.trim().length === 0
      },
      msg
    );
  }

  parseResult(msg) {
    return createUnifiedMessage(
      MessageType.RESULT,
      'claude',
      {
        text: msg.text || msg.result || '',
        success: msg.success !== false,
        durationMs: msg.duration_ms,
        costUsd: msg.cost_usd
      },
      {},
      msg
    );
  }

  parseStreamingStart(msg) {
    return createUnifiedMessage(
      MessageType.STREAMING_START,
      'claude',
      {
        index: msg.index
      },
      { hidden: true },
      msg
    );
  }

  parseStreamingDelta(msg) {
    return createUnifiedMessage(
      MessageType.STREAMING_DELTA,
      'claude',
      {
        text: msg.delta?.text || '',
        index: msg.index
      },
      {},
      msg
    );
  }

  parseStreamingEnd(msg) {
    return createUnifiedMessage(
      MessageType.STREAMING_END,
      'claude',
      {
        index: msg.index
      },
      { hidden: true },
      msg
    );
  }

  parseSessionStart(msg) {
    return createUnifiedMessage(
      MessageType.SESSION_START,
      'claude',
      {
        sessionId: msg.message?.id,
        model: msg.message?.model
      },
      { hidden: true }, // Hide session start messages
      msg
    );
  }

  parseSessionEnd(msg) {
    return createUnifiedMessage(
      MessageType.SESSION_END,
      'claude',
      {},
      { hidden: true }, // Hide session end messages
      msg
    );
  }

  parseError(msg) {
    return createUnifiedMessage(
      MessageType.ERROR,
      'claude',
      {
        text: msg.message || msg.error || 'An error occurred'
      },
      {
        errorType: msg.type,
        errorCode: msg.code
      },
      msg
    );
  }
}
