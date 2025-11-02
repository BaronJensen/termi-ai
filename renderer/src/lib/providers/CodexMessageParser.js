/**
 * OpenAI Codex Message Parser
 *
 * Transforms OpenAI Codex CLI JSON output into unified message format
 */

import { MessageType, createUnifiedMessage } from './messageFormat.js';

export class CodexMessageParser {
  /**
   * Parse a Codex message into unified format
   *
   * @param {Object} rawMessage - Raw message from Codex CLI
   * @returns {Object|null} Unified message or null if should be ignored
   */
  parse(rawMessage) {
    // Codex wraps messages in: {"id":"0","msg":{...}}
    // Extract the inner message
    const msg = rawMessage.msg || rawMessage;

    console.log(`🔍 [CodexParser] Parsing message:`, {
      hasPrompt: !!rawMessage.prompt,
      type: rawMessage.type || msg.type,
      hasWorkdir: !!(msg.workdir),
      rawMessage
    });

    // Handle prompt message (signals loading start) - sent when user submits prompt
    if (rawMessage.type === 'prompt' || msg.type === 'prompt' || rawMessage.prompt) {
      console.log(`✅ [CodexParser] Found prompt message - will trigger loading`);
      return this.parsePrompt(rawMessage.prompt ? rawMessage : msg);
    }

    // Handle config message (first message with workdir/model)
    // This is typically the FIRST message from Codex, so we'll trigger loading here too
    if (msg.workdir && msg.model && !msg.msg) {
      console.log(`✅ [CodexParser] Found config message - will trigger loading`);
      return this.parseConfig(msg);
    }

    // Handle typed messages
    if (!msg.type) {
      console.warn('[CodexParser] Message without type:', msg);
      return null;
    }

    const { type } = msg;

    switch (type) {
      // Reasoning
      case 'agent_reasoning':
        return this.parseReasoning(msg);

      // Assistant message (final)
      case 'agent_message':
        return this.parseAssistantMessage(msg);

      // Tool execution
      case 'exec_command_begin':
        return this.parseToolCallBegin(msg);

      case 'exec_command_output_delta':
        return this.parseToolOutput(msg);

      case 'exec_command_end':
        return this.parseToolCallEnd(msg);

      // File operations
      case 'patch_apply_begin':
        return this.parseFileEditBegin(msg);

      case 'patch_apply_end':
        return this.parseFileEditEnd(msg);

      case 'turn_diff':
        return this.parseDiff(msg);

      // Status
      case 'task_started':
        return this.parseTaskStarted(msg);

      // Section breaks (ignore)
      case 'agent_reasoning_section_break':
        return createUnifiedMessage(
          MessageType.STATUS,
          'codex',
          { text: '' },
          { hidden: true },
          msg
        );

      // Metadata
      case 'token_count':
        return this.parseTokenCount(msg);

      default:
        console.warn('[CodexParser] Unknown message type:', type, msg);
        return createUnifiedMessage(
          MessageType.UNKNOWN,
          'codex',
          { text: JSON.stringify(msg) },
          { hidden: true },
          msg
        );
    }
  }

  parsePrompt(msg) {
    return createUnifiedMessage(
      MessageType.USER_PROMPT,
      'codex',
      {
        text: msg.text || msg.prompt || ''
      },
      {
        // This signals to start loading state
        isStart: true
      },
      msg
    );
  }

  parseConfig(msg) {
    return createUnifiedMessage(
      MessageType.CONFIG,
      'codex',
      {
        workdir: msg.workdir,
        model: msg.model,
        provider: msg.provider
      },
      {
        hidden: true,
        isStart: true // Config message signals process start for Codex
      },
      msg
    );
  }

  parseReasoning(msg) {
    return createUnifiedMessage(
      MessageType.REASONING,
      'codex',
      {
        text: msg.text || '',
        isTemporary: true
      },
      {},
      msg
    );
  }

  parseAssistantMessage(msg) {
    return createUnifiedMessage(
      MessageType.ASSISTANT,
      'codex',
      {
        text: msg.message || msg.text || '',
        isFinal: true
      },
      {
        // This signals process completion
        isComplete: true
      },
      msg
    );
  }

  parseToolCallBegin(msg) {
    const command = Array.isArray(msg.command) ? msg.command.join(' ') : msg.command;

    return createUnifiedMessage(
      MessageType.TOOL_CALL,
      'codex',
      {
        id: msg.call_id,
        name: 'bash',
        args: { command },
        status: 'started'
      },
      {},
      msg
    );
  }

  parseToolOutput(msg) {
    // Chunk is byte array - convert to string
    const text = msg.chunk ? Buffer.from(msg.chunk).toString('utf-8') : '';

    return createUnifiedMessage(
      MessageType.TOOL_OUTPUT,
      'codex',
      {
        id: msg.call_id,
        text,
        stream: msg.stream // 'stdout' or 'stderr'
      },
      {
        // Tool output is hidden (too noisy)
        hidden: true
      },
      msg
    );
  }

  parseToolCallEnd(msg) {
    return createUnifiedMessage(
      MessageType.TOOL_RESULT,
      'codex',
      {
        id: msg.call_id,
        stdout: msg.stdout || '',
        stderr: msg.stderr || '',
        exitCode: msg.exit_code,
        success: msg.exit_code === 0
      },
      {
        // Mark tool call as completed
        isComplete: true
      },
      msg
    );
  }

  parseFileEditBegin(msg) {
    return createUnifiedMessage(
      MessageType.FILE_EDIT,
      'codex',
      {
        success: msg.success,
        changes: msg.changes
      },
      { hidden: true },
      msg
    );
  }

  parseFileEditEnd(msg) {
    return createUnifiedMessage(
      MessageType.FILE_EDIT,
      'codex',
      {
        success: msg.success,
        stdout: msg.stdout,
        stderr: msg.stderr,
        changes: msg.changes
      },
      { hidden: true },
      msg
    );
  }

  parseDiff(msg) {
    return createUnifiedMessage(
      MessageType.DIFF,
      'codex',
      {
        text: msg.unified_diff || '',
        format: 'unified'
      },
      { hidden: true },
      msg
    );
  }

  parseTaskStarted(msg) {
    return createUnifiedMessage(
      MessageType.STATUS,
      'codex',
      {
        text: 'Task started'
      },
      { hidden: true }, // Hide debugging messages
      msg
    );
  }

  parseTokenCount(msg) {
    return createUnifiedMessage(
      MessageType.METADATA,
      'codex',
      {
        tokens: {
          input: msg.input_tokens,
          output: msg.output_tokens,
          total: (msg.input_tokens || 0) + (msg.output_tokens || 0)
        }
      },
      {
        // Don't use this to stop loading - fires after each tool
        hidden: true
      },
      msg
    );
  }
}
