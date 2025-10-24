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

    // Codex CLI format (based on OpenAI CLI structure)
    // Format: codex <command> [options]

    // Add JSON output format
    args.push('--json');

    // Session/conversation ID for context
    if (sessionId) {
      args.push('--conversation-id', sessionId);
    }

    // Model selection (default to code-davinci-002 or gpt-4)
    const selectedModel = model || 'gpt-4';
    args.push('--model', selectedModel);

    // Working directory context
    args.push('--directory', cwd);

    // Environment variables for API key
    const env = {
      ...process.env
    };

    if (apiKey) {
      env.OPENAI_API_KEY = apiKey;
    }

    // Message handling
    const useStdin = message && message.length > 8000;
    if (message && !useStdin) {
      args.push('--prompt', message);
    }

    return {
      args,
      env,
      useStdin,
      stdinData: useStdin ? message : undefined
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
   * Maps OpenAI Codex response format to our internal format
   */
  transformCodexMessage(parsed) {
    // OpenAI completion format
    if (parsed.choices && Array.isArray(parsed.choices)) {
      const choice = parsed.choices[0];

      // Completion response
      if (choice.text !== undefined) {
        return {
          type: 'assistant',
          text: choice.text,
          model: parsed.model,
          session_id: parsed.id,
          finish_reason: choice.finish_reason
        };
      }

      // Chat completion response
      if (choice.message) {
        return {
          type: 'assistant',
          text: choice.message.content,
          model: parsed.model,
          session_id: parsed.id,
          finish_reason: choice.finish_reason,
          role: choice.message.role
        };
      }

      // Streaming delta
      if (choice.delta) {
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
      requiresApiKey: true
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

    // Codex requires OpenAI API key
    if (!options.apiKey && !process.env.OPENAI_API_KEY) {
      return {
        valid: false,
        error: 'Codex requires an OpenAI API key. Set OPENAI_API_KEY or provide apiKey in options.'
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
