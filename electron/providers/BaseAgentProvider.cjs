/**
 * BaseAgentProvider.cjs
 *
 * Abstract base class for AI agent providers (Cursor, Claude Code, Codex, etc.)
 * Defines the common interface that all providers must implement.
 */

class BaseAgentProvider {
  constructor(name, displayName) {
    if (new.target === BaseAgentProvider) {
      throw new TypeError('Cannot construct BaseAgentProvider instances directly');
    }
    this.name = name; // Internal identifier (e.g., 'cursor', 'claude', 'codex')
    this.displayName = displayName; // User-facing name (e.g., 'Cursor AI', 'Claude Code')
  }

  /**
   * Get the provider name
   * @returns {string}
   */
  getName() {
    return this.name;
  }

  /**
   * Get the provider display name
   * @returns {string}
   */
  getDisplayName() {
    return this.displayName;
  }

  /**
   * Check if the provider's CLI is available on the system
   * @returns {Promise<{available: boolean, path?: string, error?: string}>}
   */
  async checkAvailability() {
    throw new Error('checkAvailability() must be implemented by subclass');
  }

  /**
   * Resolve the CLI binary path
   * @returns {Promise<string>} Path to the CLI binary
   * @throws {Error} If CLI not found
   */
  async resolveCliPath() {
    throw new Error('resolveCliPath() must be implemented by subclass');
  }

  /**
   * Build command arguments for starting an agent session
   * @param {Object} options - Configuration options
   * @param {string} options.message - The user message to send
   * @param {string} options.cwd - Working directory
   * @param {string} [options.sessionId] - Session ID for resumption
   * @param {string} [options.model] - Model to use
   * @param {string} [options.apiKey] - API key if required
   * @param {Object} [options.sessionObject] - Session metadata
   * @returns {Promise<{args: string[], env?: Object, useStdin?: boolean}>}
   */
  async buildArgs(options) {
    throw new Error('buildArgs() must be implemented by subclass');
  }

  /**
   * Parse output from the CLI process
   * @param {string} data - Raw output data
   * @param {Object} context - Parsing context (buffer, state, etc.)
   * @returns {Array<{type: string, data: any}>} Parsed messages
   */
  parseOutput(data, context) {
    throw new Error('parseOutput() must be implemented by subclass');
  }

  /**
   * Handle process exit
   * @param {number} code - Exit code
   * @param {string} signal - Exit signal
   * @returns {Object} Exit information
   */
  handleExit(code, signal) {
    return {
      code,
      signal,
      error: code !== 0 ? `Process exited with code ${code}` : null
    };
  }

  /**
   * Get default configuration for this provider
   * @returns {Object}
   */
  getDefaultConfig() {
    return {
      timeout: 0, // No timeout by default
      maxBufferSize: 500 * 1024, // 500KB
      outputFormat: 'stream-json'
    };
  }

  /**
   * Validate provider-specific options
   * @param {Object} options
   * @returns {{valid: boolean, error?: string}}
   */
  validateOptions(options) {
    if (!options.cwd) {
      return { valid: false, error: 'Working directory (cwd) is required' };
    }
    if (!options.message && !options.sessionId) {
      return { valid: false, error: 'Either message or sessionId is required' };
    }
    return { valid: true };
  }

  /**
   * Get the session ID from parsed output (provider-specific)
   * @param {Object} parsedData
   * @returns {string|null}
   */
  extractSessionId(parsedData) {
    return parsedData.session_id || null;
  }

  /**
   * Format a message for sending to the CLI
   * @param {string} message
   * @returns {string}
   */
  formatMessage(message) {
    return message;
  }

  /**
   * Get provider capabilities
   * @returns {Object}
   */
  getCapabilities() {
    return {
      supportsSessionResumption: false,
      supportsStreaming: false,
      supportsToolCalls: false,
      supportsModelSelection: false,
      requiresApiKey: false
    };
  }

  /**
   * Get provider metadata
   * @returns {Object}
   */
  getMetadata() {
    return {
      name: this.name,
      displayName: this.displayName,
      version: '1.0.0',
      capabilities: this.getCapabilities()
    };
  }
}

module.exports = BaseAgentProvider;
