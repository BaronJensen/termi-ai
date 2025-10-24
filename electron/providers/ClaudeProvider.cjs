/**
 * ClaudeProvider.cjs
 *
 * Provider implementation for Claude Code CLI
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');
const BaseAgentProvider = require('./BaseAgentProvider.cjs');

const execAsync = promisify(exec);

class ClaudeProvider extends BaseAgentProvider {
  constructor() {
    super('claude', 'Claude Code');
  }

  /**
   * Check if Claude Code CLI is available
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
   * Resolve Claude Code binary path
   */
  async resolveCliPath() {
    // Common installation paths for Claude Code
    const commonPaths = [
      '/usr/local/bin/claude',
      '/opt/homebrew/bin/claude',
      path.join(process.env.HOME || '', '.local', 'bin', 'claude')
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
        process.platform === 'win32' ? 'where claude' : 'which claude'
      );
      const cliPath = stdout.trim().split('\n')[0];
      if (cliPath && fs.existsSync(cliPath)) {
        return cliPath;
      }
    } catch (error) {
      // Not in PATH
    }

    throw new Error('Claude Code CLI not found. Please install it first: npm install -g @anthropic/claude-code');
  }

  /**
   * Build arguments for Claude Code CLI
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

    // Claude Code uses a different command structure
    // Assuming it follows a similar pattern to cursor-agent
    // Format: claude [options] <message>

    // Add streaming output format
    args.push('--json'); // JSON output format

    // Session resumption (if supported by Claude Code)
    if (sessionId) {
      args.push('--session', sessionId);
    }

    // Model selection
    if (model) {
      args.push('--model', model);
    }

    // API key (Claude Code typically uses environment variable or config file)
    const env = {
      ...process.env
    };

    if (apiKey) {
      env.ANTHROPIC_API_KEY = apiKey;
    }

    // Working directory
    args.push('--cwd', cwd);

    // Message handling - use stdin for long messages
    const useStdin = message && message.length > 8000;
    if (message && !useStdin) {
      args.push(message);
    }

    return {
      args,
      env,
      useStdin,
      stdinData: useStdin ? message : undefined
    };
  }

  /**
   * Parse Claude Code CLI output
   * Claude Code outputs JSON-formatted messages
   */
  parseOutput(data, context) {
    const messages = [];
    context.buffer = context.buffer || '';
    context.buffer += data;

    // Split by newlines to process line-by-line JSON
    const lines = context.buffer.split('\n');
    context.buffer = lines.pop() || ''; // Keep incomplete line in buffer

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      try {
        const parsed = JSON.parse(trimmed);
        messages.push({
          type: 'json',
          data: this.transformClaudeMessage(parsed)
        });
      } catch (error) {
        // Not JSON, might be plain text output
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
   * Transform Claude Code message format to common format
   * This ensures compatibility with the existing UI
   */
  transformClaudeMessage(parsed) {
    // Claude API format transformation
    if (parsed.type === 'message') {
      return {
        type: 'assistant',
        text: parsed.content?.[0]?.text || '',
        model: parsed.model,
        session_id: parsed.id
      };
    }

    if (parsed.type === 'content_block_start') {
      return {
        type: 'streaming_start',
        index: parsed.index
      };
    }

    if (parsed.type === 'content_block_delta') {
      return {
        type: 'streaming',
        text: parsed.delta?.text || '',
        index: parsed.index
      };
    }

    if (parsed.type === 'content_block_stop') {
      return {
        type: 'streaming_end',
        index: parsed.index
      };
    }

    if (parsed.type === 'message_start') {
      return {
        type: 'session_start',
        session_id: parsed.message?.id,
        model: parsed.message?.model
      };
    }

    if (parsed.type === 'message_stop') {
      return {
        type: 'session_end'
      };
    }

    // Tool use (similar to cursor's tool_call)
    if (parsed.type === 'tool_use') {
      return {
        type: 'tool_call',
        tool_calls: [{
          id: parsed.id,
          name: parsed.name,
          args: parsed.input
        }]
      };
    }

    // Pass through if already in common format
    return parsed;
  }

  /**
   * Extract session ID from Claude Code output
   */
  extractSessionId(parsedData) {
    return parsedData.session_id || parsedData.id || parsedData.message?.id || null;
  }

  /**
   * Get provider capabilities
   */
  getCapabilities() {
    return {
      supportsSessionResumption: true,
      supportsStreaming: true,
      supportsToolCalls: true,
      supportsModelSelection: true,
      requiresApiKey: true
    };
  }

  /**
   * Validate Claude-specific options
   */
  validateOptions(options) {
    const baseValidation = super.validateOptions(options);
    if (!baseValidation.valid) {
      return baseValidation;
    }

    // Claude Code requires API key
    if (!options.apiKey && !process.env.ANTHROPIC_API_KEY) {
      return {
        valid: false,
        error: 'Claude Code requires an Anthropic API key. Set ANTHROPIC_API_KEY or provide apiKey in options.'
      };
    }

    return { valid: true };
  }

  /**
   * Get provider metadata
   */
  getMetadata() {
    return {
      ...super.getMetadata(),
      version: '1.0.0',
      description: 'Claude Code - AI pair programmer powered by Anthropic Claude',
      website: 'https://claude.ai',
      requiresCli: true,
      cliCommand: 'claude',
      supportedModels: [
        'claude-3-5-sonnet-20241022',
        'claude-3-opus-20240229',
        'claude-3-sonnet-20240229',
        'claude-3-haiku-20240307'
      ]
    };
  }
}

module.exports = ClaudeProvider;
