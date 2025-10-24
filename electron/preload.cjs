
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('cursovable', {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  folderSelected: (cb) => {
    const listener = (_e, folderPath) => cb(folderPath);
    ipcRenderer.on('folder-selected', listener);
    return () => ipcRenderer.removeListener('folder-selected', listener);
  },
  startVite: (opts) => ipcRenderer.invoke('vite-start', opts),
  stopVite: () => ipcRenderer.invoke('vite-stop'),
  runCursor: (opts) => ipcRenderer.invoke('cursor-run', opts),
  getHistory: () => ipcRenderer.invoke('history-get'),
  clearHistory: () => ipcRenderer.invoke('history-clear'),
  onViteLog: (cb) => {
    const listener = (_e, payload) => cb(payload);
    ipcRenderer.on('vite-log', listener);
    return () => ipcRenderer.removeListener('vite-log', listener);
  },
  onCursorLog: (cb) => {
    const listener = (_e, payload) => cb(payload);
    ipcRenderer.on('cursor-log', listener);
    return () => ipcRenderer.removeListener('cursor-log', listener);
  },
  // Performance monitoring
  startPerf: () => ipcRenderer.invoke('perf-start'),
  stopPerf: () => ipcRenderer.invoke('perf-stop'),
  onPerfStats: (cb) => {
    const listener = (_e, payload) => cb(payload);
    ipcRenderer.on('perf-stats', listener);
    return () => ipcRenderer.removeListener('perf-stats', listener);
  },
  detectProject: (folderPath) => ipcRenderer.invoke('project-detect', folderPath),
  startHtml: (opts) => ipcRenderer.invoke('html-start', opts),
  stopHtml: () => ipcRenderer.invoke('html-stop'),
  createProjectScaffold: (opts) => ipcRenderer.invoke('project-create', opts),
  installPackages: (opts) => ipcRenderer.invoke('packages-install', opts),
  openFolder: (folderPath) => ipcRenderer.invoke('open-folder', folderPath),
  detectEditors: () => ipcRenderer.invoke('detect-editors'),
  openInEditor: (opts) => ipcRenderer.invoke('open-in-editor', opts),
  getProjectRoutes: (opts) => ipcRenderer.invoke('project-routes', opts),
  sendCursorInput: (opts) => ipcRenderer.invoke('cursor-input', opts),
  sendCursorSignal: (opts) => ipcRenderer.invoke('cursor-signal', opts),
  cursorDebugLog: (opts) => ipcRenderer.invoke('cursor-debug-log', opts),
  getTerminalStatus: () => ipcRenderer.invoke('terminal-status'),
  forceTerminalCleanup: () => ipcRenderer.invoke('terminal-cleanup'),
  getWorkingDirectory: () => ipcRenderer.invoke('get-working-directory'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  setWorkingDirectory: (path) => ipcRenderer.invoke('set-working-directory', path),
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  // Cursor auth APIs
  getCursorAuthStatus: () => ipcRenderer.invoke('cursor-auth-status'),
  triggerCursorAuthLogin: () => ipcRenderer.invoke('cursor-auth-login'),
  onCursorAuthLog: (cb) => {
    const listener = (_e, payload) => cb(payload);
    ipcRenderer.on('cursor-auth-log', listener);
    return () => ipcRenderer.removeListener('cursor-auth-log', listener);
  },
  onCursorAuthLink: (cb) => {
    const listener = (_e, payload) => cb(payload);
    ipcRenderer.on('cursor-auth-link', listener);
    return () => ipcRenderer.removeListener('cursor-auth-link', listener);
  },
  // Git APIs
  getGitBranches: (opts) => ipcRenderer.invoke('git-branches', opts),
  gitCommit: (opts) => ipcRenderer.invoke('git-commit', opts),
  getReflog: (opts) => ipcRenderer.invoke('git-reflog', opts),
  restoreLocalCommit: (opts) => ipcRenderer.invoke('git-restore-local', opts),
  // Debug mode APIs
  setDebugMode: (opts) => ipcRenderer.invoke('debug-mode-set', opts),
  getDebugMode: () => ipcRenderer.invoke('debug-mode-get'),
  // Permission management APIs
  checkDirectoryPermissions: (opts) => ipcRenderer.invoke('check-directory-permissions', opts),
  fixDirectoryPermissions: (opts) => ipcRenderer.invoke('fix-directory-permissions', opts),
  // Multi-provider agent APIs
  runAgent: (opts) => ipcRenderer.invoke('agent-run', opts),
  getAgentProviders: () => ipcRenderer.invoke('agent-get-providers'),
  getAgentProviderInfo: (provider) => ipcRenderer.invoke('agent-get-provider-info', { provider }),
  sendAgentInput: (opts) => ipcRenderer.invoke('agent-input', opts),
  sendAgentSignal: (opts) => ipcRenderer.invoke('agent-signal', opts)
});
