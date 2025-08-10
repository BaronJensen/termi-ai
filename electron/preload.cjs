
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('cursovable', {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
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
  }
});
