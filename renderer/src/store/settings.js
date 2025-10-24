// Simple localStorage-backed app-wide settings

const STORAGE_KEY = 'cursovable-settings';

export function getDefaultSettings() {
  return {
    // DEPRECATED: Cursor agent timeout (no longer used - processes run until completion)
    cursorAgentTimeoutMs: 900000, // 15 minutes - kept for compatibility
    // Preferred editor id for Project View options: code | cursor | webstorm | idea | subl
    defaultEditor: '',
    // Default JS package manager: yarn | npm | pnpm
    packageManager: 'yarn',
    // Optional API key for token-based auth (Cursor)
    apiKey: '',
    // Default AI model for cursor-agent (empty string means auto/default)
    defaultModel: '',
    // === Multi-Provider Settings ===
    // Default AI agent provider: 'cursor' | 'claude' | 'codex'
    defaultProvider: 'cursor',
    // API keys for different providers
    providerApiKeys: {
      cursor: '', // Optional - for Cursor token auth
      claude: '', // Required for Claude Code
      codex: ''   // Required for Codex
    },
    // Per-provider model preferences
    providerModels: {
      cursor: '', // Empty means auto/default
      claude: 'claude-3-5-sonnet-20241022',
      codex: 'gpt-4'
    },
    // Provider-specific settings
    providerSettings: {
      cursor: {
        useTokenAuth: false
      },
      claude: {
        // Claude-specific settings
      },
      codex: {
        // Codex-specific settings
      }
    }
  };
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return { ...getDefaultSettings(), ...(parsed && typeof parsed === 'object' ? parsed : {}) };
  } catch {
    return getDefaultSettings();
  }
}

export function saveSettings(settings) {
  const next = { ...getDefaultSettings(), ...(settings || {}) };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

/**
 * Get API key for a specific provider
 * @param {string} provider - Provider name ('cursor', 'claude', 'codex')
 * @returns {string} API key or empty string
 */
export function getProviderApiKey(provider) {
  const settings = loadSettings();

  // For cursor, fall back to legacy apiKey field
  if (provider === 'cursor') {
    return settings.providerApiKeys?.cursor || settings.apiKey || '';
  }

  return settings.providerApiKeys?.[provider] || '';
}

/**
 * Get model for a specific provider
 * @param {string} provider - Provider name ('cursor', 'claude', 'codex')
 * @returns {string} Model name or empty string
 */
export function getProviderModel(provider) {
  const settings = loadSettings();

  // For cursor, fall back to legacy defaultModel field
  if (provider === 'cursor') {
    return settings.providerModels?.cursor || settings.defaultModel || '';
  }

  return settings.providerModels?.[provider] || '';
}

/**
 * Get the default provider
 * @returns {string} Provider name
 */
export function getDefaultProvider() {
  const settings = loadSettings();
  return settings.defaultProvider || 'cursor';
}

/**
 * Set the default provider
 * @param {string} provider - Provider name
 */
export function setDefaultProvider(provider) {
  const settings = loadSettings();
  settings.defaultProvider = provider;
  return saveSettings(settings);
}

/**
 * Update provider API key
 * @param {string} provider - Provider name
 * @param {string} apiKey - API key value
 */
export function setProviderApiKey(provider, apiKey) {
  const settings = loadSettings();
  if (!settings.providerApiKeys) {
    settings.providerApiKeys = {};
  }
  settings.providerApiKeys[provider] = apiKey;

  // Also update legacy apiKey for cursor
  if (provider === 'cursor') {
    settings.apiKey = apiKey;
  }

  return saveSettings(settings);
}

/**
 * Update provider model
 * @param {string} provider - Provider name
 * @param {string} model - Model name
 */
export function setProviderModel(provider, model) {
  const settings = loadSettings();
  if (!settings.providerModels) {
    settings.providerModels = {};
  }
  settings.providerModels[provider] = model;

  // Also update legacy defaultModel for cursor
  if (provider === 'cursor') {
    settings.defaultModel = model;
  }

  return saveSettings(settings);
}


