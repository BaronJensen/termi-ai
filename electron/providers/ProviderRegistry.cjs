/**
 * ProviderRegistry.cjs
 *
 * Central registry for managing AI agent providers
 * Handles provider registration, discovery, and lifecycle
 */

class ProviderRegistry {
  constructor() {
    this.providers = new Map(); // name -> provider instance
    this.activeProviders = new Set(); // Currently active provider names
  }

  /**
   * Register a new provider
   * @param {BaseAgentProvider} provider
   */
  register(provider) {
    if (!provider || typeof provider.getName !== 'function') {
      throw new Error('Invalid provider: must extend BaseAgentProvider');
    }

    const name = provider.getName();
    if (this.providers.has(name)) {
      console.warn(`Provider '${name}' is already registered, replacing...`);
    }

    this.providers.set(name, provider);
    console.log(`✅ Registered provider: ${provider.getDisplayName()} (${name})`);
  }

  /**
   * Unregister a provider
   * @param {string} name
   */
  unregister(name) {
    if (this.activeProviders.has(name)) {
      console.warn(`Cannot unregister active provider: ${name}`);
      return false;
    }
    return this.providers.delete(name);
  }

  /**
   * Get a provider by name
   * @param {string} name
   * @returns {BaseAgentProvider|null}
   */
  getProvider(name) {
    return this.providers.get(name) || null;
  }

  /**
   * Get all registered providers
   * @returns {Array<BaseAgentProvider>}
   */
  getAllProviders() {
    return Array.from(this.providers.values());
  }

  /**
   * Get all available providers (those with CLI installed)
   * @returns {Promise<Array<{name: string, displayName: string, available: boolean, path?: string}>>}
   */
  async getAvailableProviders() {
    const results = [];

    for (const provider of this.providers.values()) {
      try {
        const availability = await provider.checkAvailability();
        results.push({
          name: provider.getName(),
          displayName: provider.getDisplayName(),
          available: availability.available,
          path: availability.path,
          capabilities: provider.getCapabilities(),
          metadata: provider.getMetadata()
        });
      } catch (error) {
        console.error(`Error checking availability for ${provider.getName()}:`, error);
        results.push({
          name: provider.getName(),
          displayName: provider.getDisplayName(),
          available: false,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Check if a provider is registered
   * @param {string} name
   * @returns {boolean}
   */
  hasProvider(name) {
    return this.providers.has(name);
  }

  /**
   * Mark a provider as active
   * @param {string} name
   */
  markActive(name) {
    if (!this.hasProvider(name)) {
      throw new Error(`Provider '${name}' not registered`);
    }
    this.activeProviders.add(name);
  }

  /**
   * Mark a provider as inactive
   * @param {string} name
   */
  markInactive(name) {
    this.activeProviders.delete(name);
  }

  /**
   * Check if a provider is active
   * @param {string} name
   * @returns {boolean}
   */
  isActive(name) {
    return this.activeProviders.has(name);
  }

  /**
   * Get all active providers
   * @returns {Array<string>}
   */
  getActiveProviders() {
    return Array.from(this.activeProviders);
  }

  /**
   * Get provider metadata for all registered providers
   * @returns {Array<Object>}
   */
  getProvidersMetadata() {
    return this.getAllProviders().map(provider => provider.getMetadata());
  }

  /**
   * Clear all providers
   */
  clear() {
    if (this.activeProviders.size > 0) {
      console.warn('Clearing registry with active providers:', Array.from(this.activeProviders));
    }
    this.providers.clear();
    this.activeProviders.clear();
  }

  /**
   * Get the default provider
   * @returns {BaseAgentProvider|null}
   */
  getDefaultProvider() {
    // Priority: cursor > claude > codex > first available
    const priorityOrder = ['cursor', 'claude', 'codex'];

    for (const name of priorityOrder) {
      const provider = this.providers.get(name);
      if (provider) return provider;
    }

    // Return first provider if no priority match
    const first = this.providers.values().next();
    return first.done ? null : first.value;
  }
}

// Singleton instance
const registry = new ProviderRegistry();

module.exports = registry;
