
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
  getTerminalStatus: () => ipcRenderer.invoke('terminal-status'),
  forceTerminalCleanup: () => ipcRenderer.invoke('terminal-cleanup'),
  getWorkingDirectory: () => ipcRenderer.invoke('get-working-directory'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  setWorkingDirectory: (path) => ipcRenderer.invoke('set-working-directory', path)
});
