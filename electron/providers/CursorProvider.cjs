/**
 * CursorProvider.cjs
 *
 * Provider implementation for Cursor AI CLI (cursor-agent)
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');
const BaseAgentProvider = require('./BaseAgentProvider.cjs');

const execAsync = promisify(exec);

class CursorProvider extends BaseAgentProvider {
  constructor() {
    super('cursor', 'Cursor AI');
  }

  /**
   * Check if cursor-agent CLI is available
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
   * Resolve cursor-agent binary path
   */
  async resolveCliPath() {
    // Check Homebrew paths first (macOS)
    const homebrewPaths = [
      '/opt/homebrew/bin/cursor-agent',
      '/usr/local/bin/cursor-agent'
    ];

    for (const p of homebrewPaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }

    // Check in PATH
    try {
      const { stdout } = await execAsync(
        process.platform === 'win32' ? 'where cursor-agent' : 'which cursor-agent'
      );
      const cliPath = stdout.trim().split('\n')[0];
      if (cliPath && fs.existsSync(cliPath)) {
        return cliPath;
      }
    } catch (error) {
      // Not in PATH
    }

    throw new Error('cursor-agent not found. Please install it first: npm install -g cursor-agent');
  }

  /**
   * Build arguments for cursor-agent
   */
  async buildArgs(options) {
    const {
      message,
      sessionId,
      model,
      apiKey,
      cwd
    } = options;

    const args = ['-p', '--output-format', 'stream-json', '--stream-partial-output', '--force'];

    // Session resumption
    if (sessionId) {
      args.push('--resume', sessionId);
    }

    // Model selection
    if (model) {
      args.push('--model', model);
    }

    // Token-based auth
    if (apiKey) {
      args.push('-a', apiKey);
    }

    // Environment variables
    const env = {
      ...process.env,
      CURSOR_CLI_API_KEY: apiKey || ''
    };

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
   * Parse cursor-agent output
   */
  parseOutput(data, context) {
    const messages = [];
    context.buffer = context.buffer || '';
    context.buffer += data;

    // Extract JSON objects from buffer
    const extracted = this.extractJsonObjectsWithRanges(context.buffer);

    for (const { json, start, end } of extracted) {
      try {
        const parsed = JSON.parse(json);
        messages.push({
          type: 'json',
          data: parsed
        });
      } catch (error) {
        console.error('Failed to parse JSON:', error);
      }
    }

    // Remove processed JSON from buffer
    if (extracted.length > 0) {
      const lastEnd = extracted[extracted.length - 1].end;
      context.buffer = context.buffer.slice(lastEnd);
    }

    // Buffer management - prevent overflow
    if (context.buffer.length > 500 * 1024) {
      console.warn('⚠️  Buffer overflow detected, truncating to last 250KB');
      context.buffer = context.buffer.slice(-250 * 1024);
    }

    return messages;
  }

  /**
   * Extract JSON objects with their positions in the text
   * Handles nested structures, arrays, and special characters
   */
  extractJsonObjectsWithRanges(text) {
    const results = [];
    let i = 0;
    const seenHashes = new Set(); // Deduplication

    while (i < text.length) {
      if (text[i] === '{') {
        const result = this.extractJsonObject(text, i);
        if (result) {
          // Deduplicate based on content hash
          const hash = this.hashString(result.json);
          if (!seenHashes.has(hash)) {
            seenHashes.add(hash);
            results.push(result);
          }
          i = result.end;
        }
      } else if (text[i] === '[') {
        const result = this.extractJsonArray(text, i);
        if (result) {
          const hash = this.hashString(result.json);
          if (!seenHashes.has(hash)) {
            seenHashes.add(hash);
            results.push(result);
          }
          i = result.end;
        }
      }
      i++;
    }

    return results;
  }

  /**
   * Extract a single JSON object
   */
  extractJsonObject(text, start) {
    let depth = 0;
    let inString = false;
    let escapeNext = false;

    for (let i = start; i < text.length; i++) {
      const ch = text[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (ch === '\\') {
        escapeNext = true;
        continue;
      }

      if (ch === '"' && !escapeNext) {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (ch === '{') {
          depth++;
        } else if (ch === '}') {
          depth--;
          if (depth === 0) {
            const jsonStr = text.slice(start, i + 1);
            try {
              JSON.parse(jsonStr); // Validate
              return { json: jsonStr, start, end: i + 1 };
            } catch (e) {
              return null;
            }
          }
        }
      }
    }

    return null;
  }

  /**
   * Extract a JSON array
   */
  extractJsonArray(text, start) {
    let depth = 0;
    let inString = false;
    let escapeNext = false;

    for (let i = start; i < text.length; i++) {
      const ch = text[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (ch === '\\') {
        escapeNext = true;
        continue;
      }

      if (ch === '"' && !escapeNext) {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (ch === '[') {
          depth++;
        } else if (ch === ']') {
          depth--;
          if (depth === 0) {
            const jsonStr = text.slice(start, i + 1);
            try {
              JSON.parse(jsonStr); // Validate
              return { json: jsonStr, start, end: i + 1 };
            } catch (e) {
              return null;
            }
          }
        }
      }
    }

    return null;
  }

  /**
   * Simple string hash for deduplication
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }

  /**
   * Extract session ID from cursor-agent output
   */
  extractSessionId(parsedData) {
    return parsedData.session_id || parsedData.cursor_session_id || null;
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
      requiresApiKey: false // Optional
    };
  }

  /**
   * Get provider metadata
   */
  getMetadata() {
    return {
      ...super.getMetadata(),
      version: '1.0.0',
      description: 'Cursor AI agent with advanced code editing capabilities',
      website: 'https://cursor.sh',
      requiresCli: true,
      cliCommand: 'cursor-agent'
    };
  }
}

module.exports = CursorProvider;
