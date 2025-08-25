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
    // Optional API key for token-based auth
    apiKey: '',
    // Default AI model for cursor-agent (empty string means auto/default)
    defaultModel: ''
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


