/**
 * CodexProvider.cjs
 *
 * Provider implementation for OpenAI Codex CLI
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');
const BaseAgentProvider = require('./BaseAgentProvider.cjs');

const execAsync = promisify(exec);

class CodexProvider extends BaseAgentProvider {
  constructor() {
    super('codex', 'OpenAI Codex');
  }

  /**
   * Check if Codex CLI is available
   */
  async checkAvailability() {
    try {
      const cliPath = await this.resolveCliPath();
      return {
        available: true,
        path: cliPath
      };
    } catch (error) {
      return {
        available: false,
        error: error.message
      };
    }
  }

  /**
   * Resolve Codex binary path
   */
  async resolveCliPath() {
    // Common installation paths for Codex CLI
    const commonPaths = [
      '/usr/local/bin/codex',
      '/opt/homebrew/bin/codex',
      path.join(process.env.HOME || '', '.local', 'bin', 'codex'),
      // Also check for 'openai' CLI which might include codex
      '/usr/local/bin/openai',
      '/opt/homebrew/bin/openai'
    ];

    // Check common paths
    for (const p of commonPaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }

    // Check in PATH
    try {
      const { stdout } = await execAsync(
        process.platform === 'win32' ? 'where codex' : 'which codex'
      );
      const cliPath = stdout.trim().split('\n')[0];
      if (cliPath && fs.existsSync(cliPath)) {
        return cliPath;
      }
    } catch (error) {
      // Try 'openai' command as fallback
      try {
        const { stdout } = await execAsync(
          process.platform === 'win32' ? 'where openai' : 'which openai'
        );
        const cliPath = stdout.trim().split('\n')[0];
        if (cliPath && fs.existsSync(cliPath)) {
          return cliPath;
        }
      } catch (e) {
        // Neither found
      }
    }

    throw new Error('Codex CLI not found. Please install it first: pip install openai-codex');
  }

  /**
   * Build arguments for Codex CLI
   */
  async buildArgs(options) {
    const {
      message,
      sessionId,
      model,
      apiKey,
      cwd
    } = options;

    const args = [];

    // Codex CLI command structure
    // Format: codex exec [options] <prompt>

    // Use 'exec' command for non-interactive execution
    args.push('exec');

    // Add JSON output format flag
    args.push('--json');

    // Model selection
    if (model) {
      args.push('--model', model);
    }

    // Working directory
    if (cwd) {
      args.push('--cd', cwd);
    }

    // Enable automatic approval for tool calls (similar to cursor-agent --force)
    args.push('--full-auto');

    // Environment variables for API key
    const env = {
      ...process.env
    };

    if (apiKey) {
      env.OPENAI_API_KEY = apiKey;
    }

    // The prompt should be the last argument
    if (message) {
      args.push(message);
    }

    return {
      args,
      env,
      useStdin: false, // Codex CLI takes prompt as argument
      stdinData: undefined
    };
  }

  /**
   * Parse Codex CLI output
   * Codex typically outputs JSON-formatted responses
   */
  parseOutput(data, context) {
    const messages = [];
    context.buffer = context.buffer || '';
    context.buffer += data;

    // Codex may output line-delimited JSON or single JSON objects
    const lines = context.buffer.split('\n');
    context.buffer = lines.pop() || ''; // Keep incomplete line in buffer

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      try {
        const parsed = JSON.parse(trimmed);
        messages.push({
          type: 'json',
          data: this.transformCodexMessage(parsed)
        });
      } catch (error) {
        // Not JSON, might be plain text
        if (trimmed.length > 0) {
          messages.push({
            type: 'text',
            data: { text: trimmed }
          });
        }
      }
    }

    // Buffer management
    if (context.buffer.length > 500 * 1024) {
      console.warn('⚠️  Buffer overflow detected, truncating');
      context.buffer = context.buffer.slice(-250 * 1024);
    }

    return messages;
  }

  /**
   * Transform Codex message format to common format
   * Maps Codex CLI JSON format to our internal format
   */
  transformCodexMessage(parsed) {
    // Handle top-level prompt message (signals start)
    if (parsed.prompt) {
      return {
        type: 'prompt',
        text: parsed.prompt,
        isStart: true
      };
    }

    // Handle top-level config/settings (first message)
    if (parsed.workdir && parsed.model && !parsed.msg) {
      return {
        type: 'config',
        workdir: parsed.workdir,
        model: parsed.model,
        provider: parsed.provider,
        hidden: true // Don't display in UI
      };
    }

    // Codex CLI wraps messages in: {"id":"0","msg":{...}}
    const msg = parsed.msg || parsed;

    // Handle different message types
    if (msg.type) {
      switch (msg.type) {
        case 'agent_reasoning':
          // Reasoning text from the agent
          return {
            type: 'reasoning',
            text: msg.text || ''
          };

        case 'agent_message':
          // Final assistant message
          return {
            type: 'assistant',
            text: msg.message || msg.text || ''
          };

        case 'exec_command_begin':
          // Tool call starting
          return {
            type: 'tool_call',
            tool: 'bash',
            command: Array.isArray(msg.command) ? msg.command.join(' ') : msg.command,
            call_id: msg.call_id
          };

        case 'exec_command_output_delta':
          // Streaming command output (chunk is byte array)
          const text = msg.chunk ? Buffer.from(msg.chunk).toString('utf-8') : '';
          return {
            type: 'tool_output',
            text: text,
            call_id: msg.call_id,
            stream: msg.stream // 'stdout' or 'stderr'
          };

        case 'exec_command_end':
          // Command execution finished
          return {
            type: 'tool_result',
            stdout: msg.stdout || '',
            stderr: msg.stderr || '',
            exit_code: msg.exit_code,
            call_id: msg.call_id
          };

        case 'patch_apply_begin':
        case 'patch_apply_end':
          // File edit operations
          return {
            type: 'file_edit',
            success: msg.success,
            changes: msg.changes,
            stdout: msg.stdout,
            stderr: msg.stderr
          };

        case 'turn_diff':
          // Git diff of changes
          return {
            type: 'diff',
            text: msg.unified_diff || ''
          };

        case 'task_started':
          return {
            type: 'status',
            text: 'Task started'
          };

        case 'agent_reasoning_section_break':
          // Section breaks between reasoning steps (can be ignored in UI)
          return {
            type: 'section_break',
            hidden: true
          };

        case 'token_count':
          // Token usage info - fires after each tool, NOT process end
          return {
            type: 'metadata',
            tokens: msg
          };

        default:
          // Unknown message type, return as-is
          return {
            type: 'unknown',
            data: msg
          };
      }
    }

    // Fallback: Old OpenAI completion format (kept for compatibility)
    if (parsed.choices && Array.isArray(parsed.choices)) {
      const choice = parsed.choices[0];

      // Completion response
      if (choice.text !== undefined) {
        return {
          type: 'streaming',
          text: choice.delta.content || '',
          finish_reason: choice.finish_reason
        };
      }
    }

    // Function calling (tool use)
    if (parsed.function_call) {
      return {
        type: 'tool_call',
        tool_calls: [{
          id: parsed.id,
          name: parsed.function_call.name,
          args: JSON.parse(parsed.function_call.arguments || '{}')
        }]
      };
    }

    // Error response
    if (parsed.error) {
      return {
        type: 'error',
        error: parsed.error.message || 'Unknown error',
        code: parsed.error.code
      };
    }

    // Pass through if already in common format
    return parsed;
  }

  /**
   * Extract session ID from Codex output
   */
  extractSessionId(parsedData) {
    return parsedData.session_id || parsedData.id || parsedData.conversation_id || null;
  }

  /**
   * Get provider capabilities
   */
  getCapabilities() {
    return {
      supportsSessionResumption: true,
      supportsStreaming: true,
      supportsToolCalls: true, // GPT-4 supports function calling
      supportsModelSelection: true,
      requiresApiKey: false // Optional - uses terminal auth if already authenticated
    };
  }

  /**
   * Validate Codex-specific options
   */
  validateOptions(options) {
    const baseValidation = super.validateOptions(options);
    if (!baseValidation.valid) {
      return baseValidation;
    }

    // API key is optional - will use terminal auth if not provided
    return { valid: true };
  }

  /**
   * Get provider metadata
   */
  getMetadata() {
    return {
      ...super.getMetadata(),
      version: '1.0.0',
      description: 'OpenAI Codex - AI system for code generation and understanding',
      website: 'https://openai.com/blog/openai-codex',
      requiresCli: true,
      cliCommand: 'codex',
      supportedModels: [
        'gpt-4',
        'gpt-4-turbo-preview',
        'gpt-3.5-turbo',
        'code-davinci-002',
        'code-cushman-001'
      ]
    };
  }

  /**
   * Format message for Codex
   * Codex works better with code-specific prompts
   */
  formatMessage(message) {
    // Optionally enhance the message with code-specific context
    return message;
  }
}

module.exports = CodexProvider;
