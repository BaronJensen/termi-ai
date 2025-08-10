
const { app, BrowserWindow, ipcMain, dialog, session } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');

const { startVite, stopVite } = require('./viteRunner.cjs');
const { runCursorAgent } = require('./runner.cjs');
const { HistoryStore } = require('./historyStore.cjs');

// Dev: allow insecure localhost and certificate errors (must be set before ready)
if (process.env.RENDERER_URL) {
  try {
    app.commandLine.appendSwitch('ignore-certificate-errors');
    app.commandLine.appendSwitch('allow-insecure-localhost', 'true');
  } catch {}
}

let win;
let viteProcess = null;
const history = new HistoryStore(app);

function isPrivateHost(hostname) {
  if (!hostname) return false;
  if (hostname === 'localhost') return true;
  // 127.0.0.0/8, 0.0.0.0, 10.0.0.0/8, 172.16.0.0 - 172.31.255.255, 192.168.0.0/16
  if (/^(127\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.test(hostname)) return true;
  if (/^(0\.0\.0\.0)$/.test(hostname)) return true;
  if (/^(10\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.test(hostname)) return true;
  if (/^(172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})$/.test(hostname)) return true;
  if (/^(192\.168\.\d{1,3}\.\d{1,3})$/.test(hostname)) return true;
  return false;
}

function createWindow() {
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
      webSecurity: false,
      allowRunningInsecureContent: true
    }
  });

  const rendererUrl = process.env.RENDERER_URL;
  if (rendererUrl) {
    win.loadURL(rendererUrl);
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  // In dev, allow insecure localhost to avoid mkcert/self-signed issues
  if (process.env.RENDERER_URL) {
    try {
      app.commandLine.appendSwitch('ignore-certificate-errors');
      app.commandLine.appendSwitch('allow-insecure-localhost', 'true');
      session.defaultSession.setCertificateVerifyProc((request, callback) => {
        try {
          const { hostname } = new URL(request.requestURL || '');
          if (isPrivateHost(hostname)) return callback(0);
        } catch {}
        return callback(-2);
      });
    } catch {}
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Allow self-signed HTTPS certificates for local/private addresses (dev convenience)
app.on('certificate-error', (event, _webContents, url, _error, _certificate, callback) => {
  try {
    const { hostname } = new URL(url);
    if (isPrivateHost(hostname)) {
      event.preventDefault();
      callback(true);
      return;
    }
  } catch {}
  callback(false);
});

// IPC handlers
ipcMain.handle('select-folder', async () => {
  const res = await dialog.showOpenDialog(win, {
    properties: ['openDirectory']
  });
  if (res.canceled || res.filePaths.length === 0) return null;
  return res.filePaths[0];
});

ipcMain.handle('vite-start', async (_e, { folderPath, manager }) => {
  if (!folderPath) throw new Error('No folderPath provided');
  if (viteProcess) {
    try { await stopVite(viteProcess); } catch (e) {}
  }
  const { child, urlPromise } = startVite(folderPath, manager || 'yarn', (level, line) => {
    try { if (win && !win.isDestroyed()) win.webContents.send('vite-log', { level, line, ts: Date.now() }); } catch {}
  });
  viteProcess = child;
  const url = (await urlPromise).replace('0.0.0.0', 'localhost');
  return { url };
});

ipcMain.handle('vite-stop', async () => {
  if (viteProcess) {
    await stopVite(viteProcess);
    viteProcess = null;
  }
  return true;
});

ipcMain.handle('cursor-run', async (_e, { message, apiKey, runId: clientRunId }) => {
  if (!message || !message.trim()) {
    throw new Error('Empty message');
  }
  const runId = clientRunId || `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  const resultJson = await runCursorAgent(message, apiKey, (level, line) => {
    try { if (win && !win.isDestroyed()) win.webContents.send('cursor-log', { runId, level, line, ts: Date.now() }); } catch {}
  });
  const enriched = { ...resultJson, message, runId };
  history.push(enriched);
  return enriched;
});

ipcMain.handle('history-get', async () => {
  return history.read();
});

ipcMain.handle('history-clear', async () => {
  history.clear();
  return [];
});
