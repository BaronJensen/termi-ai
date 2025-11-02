/**
 * Parser Registry
 *
 * Central registry for provider-specific message parsers
 * Automatically selects the correct parser based on provider name or message metadata
 */

import { ClaudeMessageParser } from './ClaudeMessageParser.js';
import { CodexMessageParser } from './CodexMessageParser.js';
import { CursorMessageParser } from './CursorMessageParser.js';

export class ParserRegistry {
  constructor() {
    this.parsers = {
      claude: new ClaudeMessageParser(),
      codex: new CodexMessageParser(),
      cursor: new CursorMessageParser()
    };

    this.defaultProvider = 'cursor'; // Default fallback
  }

  /**
   * Get parser for a specific provider
   *
   * @param {string} provider - Provider name ('cursor', 'claude', 'codex')
   * @returns {Object} Parser instance
   */
  getParser(provider) {
    const normalizedProvider = provider?.toLowerCase();
    const parser = this.parsers[normalizedProvider];

    if (!parser) {
      console.warn(`[ParserRegistry] No parser found for provider: ${provider}, using default: ${this.defaultProvider}`);
      return this.parsers[this.defaultProvider];
    }

    return parser;
  }

  /**
   * Parse a message using the appropriate provider parser
   *
   * @param {Object} rawMessage - Raw message from any provider
   * @param {string} provider - Provider name
   * @returns {Object|null} Unified message or null
   */
  parse(rawMessage, provider) {
    if (!rawMessage) {
      console.warn('[ParserRegistry] Received null/undefined message');
      return null;
    }

    // Get the parser for this provider
    const parser = this.getParser(provider);

    try {
      return parser.parse(rawMessage);
    } catch (error) {
      console.error(`[ParserRegistry] Error parsing message from ${provider}:`, error, rawMessage);
      return null;
    }
  }

  /**
   * Auto-detect provider from message and parse
   * Falls back to explicit provider parameter if detection fails
   *
   * @param {Object} rawMessage - Raw message
   * @param {string} fallbackProvider - Fallback provider name
   * @returns {Object|null} Unified message or null
   */
  parseAuto(rawMessage, fallbackProvider = 'cursor') {
    if (!rawMessage) {
      return null;
    }

    // Try to detect provider from message metadata
    const detectedProvider = this.detectProvider(rawMessage);
    const provider = detectedProvider || fallbackProvider;

    return this.parse(rawMessage, provider);
  }

  /**
   * Detect provider from message structure
   *
   * @param {Object} message - Raw message
   * @returns {string|null} Provider name or null
   */
  detectProvider(message) {
    // Claude Code specific markers
    if (message.type === 'stream_event' || message.event || message.tool_use_id) {
      return 'claude';
    }

    // Codex specific markers
    if (message.msg || message.workdir || message.type === 'agent_reasoning' || message.type === 'exec_command_begin') {
      return 'codex';
    }

    // Cursor specific markers
    if (message.session_id || message.type === 'session_start') {
      return 'cursor';
    }

    return null;
  }

  /**
   * Register a custom parser
   *
   * @param {string} provider - Provider name
   * @param {Object} parser - Parser instance with parse() method
   */
  registerParser(provider, parser) {
    if (!parser || typeof parser.parse !== 'function') {
      throw new Error('Parser must have a parse() method');
    }

    this.parsers[provider.toLowerCase()] = parser;
  }

  /**
   * Get all registered providers
   *
   * @returns {string[]} Array of provider names
   */
  getProviders() {
    return Object.keys(this.parsers);
  }
}

// Export singleton instance
export const parserRegistry = new ParserRegistry();
