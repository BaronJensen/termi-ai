/**
 * providers/index.cjs
 *
 * Central export point for all agent providers
 * Initializes and registers all available providers
 */

const registry = require('./ProviderRegistry.cjs');
const BaseAgentProvider = require('./BaseAgentProvider.cjs');
const CursorProvider = require('./CursorProvider.cjs');
const ClaudeProvider = require('./ClaudeProvider.cjs');
const CodexProvider = require('./CodexProvider.cjs');

// Initialize and register all providers
function initializeProviders() {
  console.log('🚀 Initializing AI agent providers...');

  // Register all providers
  registry.register(new CursorProvider());
  registry.register(new ClaudeProvider());
  registry.register(new CodexProvider());

  console.log(`✅ Registered ${registry.getAllProviders().length} provider(s)`);
}

// Auto-initialize on module load
initializeProviders();

module.exports = {
  registry,
  BaseAgentProvider,
  CursorProvider,
  ClaudeProvider,
  CodexProvider,
  initializeProviders
};
