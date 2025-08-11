// Simple localStorage-backed app-wide settings

const STORAGE_KEY = 'cursovable-settings';

export function getDefaultSettings() {
  return {
    // Cursor agent overall timeout in milliseconds (0 to disable)
    cursorAgentTimeoutMs: 900000, // 15 minutes
    // Preferred editor id for Project View options: code | cursor | webstorm | idea | subl
    defaultEditor: '',
    // Default JS package manager: yarn | npm | pnpm
    packageManager: 'yarn',
    // Optional API key for token-based auth
    apiKey: ''
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


