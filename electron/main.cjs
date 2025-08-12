
const { app, BrowserWindow, ipcMain, dialog, session, Menu, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');

// PTY module - will be loaded lazily when needed
let pty = null;
let ptyLoadAttempted = false;

function loadPTY() {
  if (ptyLoadAttempted) return pty;
  ptyLoadAttempted = true;
  
  try {
    pty = require('node-pty');
    console.log('✅ node-pty loaded successfully');
    return pty;
  } catch (err) {
    console.warn('node-pty not available, terminal features will be limited:', err.message);
    return null;
  }
}

const { startVite, stopVite } = require('./viteRunner.cjs');
const { startHtmlServer } = require('./htmlServer.cjs');
const { runCursorAgent, startCursorAgent } = require('./runner.cjs');
const { HistoryStore } = require('./historyStore.cjs');

// Ensure PATH includes common Homebrew locations (helps find cursor-agent)
function ensureDarwinPath(originalPath) {
  if (process.platform !== 'darwin') return originalPath;
  const extras = ['/usr/local/bin', '/opt/homebrew/bin'];
  const parts = (originalPath || '').split(':');
  for (const p of extras) {
    if (!parts.includes(p)) parts.unshift(p);
  }
  return parts.filter(Boolean).join(':');
}

function resolveCommandPath(command, envPath) {
  const fs = require('fs');
  const path = require('path');
  const candidates = new Set();
  const parts = (envPath || '').split(':').filter(Boolean);
  for (const dir of parts) {
    candidates.add(path.join(dir, command));
  }
  // Common Homebrew paths first
  candidates.add('/opt/homebrew/bin/cursor-agent');
  candidates.add('/usr/local/bin/cursor-agent');
  for (const candidate of candidates) {
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      return candidate;
    } catch {}
  }
  return null;
}

// Remove ANSI escape sequences and non-printable control chars
function stripAnsi(input) {
  try {
    const s = String(input || '');
    return s
      // CSI (Control Sequence Introducer) sequences like \x1B[31m
      .replace(/\x1B\[[0-?]*[ -\/]*[@-~]/g, '')
      // ESC-prefixed sequences
      .replace(/\u001b\[[0-9;]*[A-Za-z]/g, '')
      // Other non-printable except tab/newline/carriage return
      .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '');
  } catch {
    return String(input || '');
  }
}

// Dev: allow insecure localhost and certificate errors (must be set before ready)
if (process.env.RENDERER_URL) {
  try {
    app.commandLine.appendSwitch('ignore-certificate-errors');
    app.commandLine.appendSwitch('allow-insecure-localhost', 'true');
  } catch {}
}

let win;
let viteProcess = null;
let htmlServerRef = null; // { stop, urlPromise }
let lastViteFolder = null;
const agentProcs = new Map(); // runId -> childRef
let persistentTerminal = null; // Always-available terminal session
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
    // Set window icon (used on Windows/Linux; ignored on macOS)
    icon: path.join(__dirname, 'images', 'icon_square.png'),
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
    // Prefer built renderer if available
    try {
      const builtIndex = path.join(__dirname, '../renderer/dist/index.html');
      const devIndex = path.join(__dirname, '../renderer/index.html');
      if (fs.existsSync(builtIndex)) {
        win.loadFile(builtIndex);
      } else {
        win.loadFile(devIndex);
      }
    } catch {
      win.loadFile(path.join(__dirname, '../renderer/index.html'));
    }
  }

  // Set Dock icon on macOS
  try {
    if (process.platform === 'darwin' && app.dock) {
      const { nativeImage } = require('electron');
      const dockIcon = nativeImage.createFromPath(path.join(__dirname, 'images', 'icon_rounded.png'));
      if (!dockIcon.isEmpty()) app.dock.setIcon(dockIcon);
    }
  } catch {}

  // Inject favicon into the document at runtime using data URI (works in dev and prod)
  try {
    const iconPath = path.join(__dirname, 'images', 'icon_square.png');
    const iconBytes = fs.readFileSync(iconPath);
    const dataUri = `data:image/png;base64,${iconBytes.toString('base64')}`;
    win.webContents.on('dom-ready', () => {
      try {
        win.webContents.executeJavaScript(`
          (function(){
            try {
              var link = document.querySelector('link[rel="icon"]') || document.createElement('link');
              link.setAttribute('rel','icon');
              link.setAttribute('type','image/png');
              link.setAttribute('href','${dataUri}');
              document.head && document.head.appendChild(link);
            } catch (e) {}
          })();
        `);
      } catch {}
    });
  } catch {}
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Select Folder',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            if (win && !win.isDestroyed()) {
              const res = await dialog.showOpenDialog(win, {
                properties: ['openDirectory']
              });
              if (!res.canceled && res.filePaths.length > 0) {
                const folderPath = res.filePaths[0];
                lastViteFolder = folderPath; // Set the working directory immediately
                win.webContents.send('folder-selected', folderPath);
                updateMenuStatus(); // Update menu to show new working directory
              }
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => app.quit()
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(process.platform === 'darwin' ? [{ role: 'pasteAndMatchStyle' }] : []),
        { role: 'delete' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Terminal Status',
      submenu: [
        {
          label: 'Status: None',
          enabled: false,
          id: 'terminal-status'
        },
        {
          label: 'Processes: 0',
          enabled: false,
          id: 'terminal-processes'
        },
        {
          label: 'PTY: ✗',
          enabled: false,
          id: 'terminal-pty'
        },
        {
          label: 'Vite: ✗',
          enabled: false,
          id: 'terminal-vite'
        },
        {
          label: 'Working Dir: None',
          enabled: false,
          id: 'terminal-working-dir'
        },
        { type: 'separator' },
        {
          label: 'Start Vite',
          enabled: false,
          id: 'terminal-start-vite',
          click: async () => {
            try {
              if (lastViteFolder) {
                await win.webContents.executeJavaScript(`
                  if (window.cursovable && window.cursovable.startVite) {
                    window.cursovable.startVite({ folderPath: '${lastViteFolder}', manager: 'yarn' });
                  }
                `);
              }
            } catch (err) {
              console.error('Failed to start Vite from menu:', err);
            }
          }
        },
        {
          label: 'Stop Vite',
          enabled: false,
          id: 'terminal-stop-vite',
          click: async () => {
            try {
              await win.webContents.executeJavaScript(`
                if (window.cursovable && window.cursovable.stopVite) {
                  window.cursovable.stopVite();
                }
              `);
            } catch (err) {
              console.error('Failed to stop Vite from menu:', err);
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Force Cleanup',
          click: async () => {
            try {
              await win.webContents.executeJavaScript(`
                if (window.cursovable && window.cursovable.forceTerminalCleanup) {
                  window.cursovable.forceTerminalCleanup();
                }
              `);
            } catch (err) {
              console.error('Failed to trigger cleanup from menu:', err);
            }
          }
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => {
            dialog.showMessageBox(win, {
              type: 'info',
              title: 'About Cursovable',
              message: 'Cursovable - AI-powered development environment',
              detail: 'Version 1.0.0\nA modern development environment with AI assistance.'
            });
          }
        }
      ]
    }
  ];

  // Add macOS-specific menu adjustments
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
  
  return menu;
}

function updateMenuStatus() {
  try {
    const menu = Menu.getApplicationMenu();
    if (!menu) return;

    // Get terminal status
    const ptyModule = loadPTY();
    const hasPty = !!ptyModule;
    const hasPersistentTerminal = !!persistentTerminal;
    const processCount = agentProcs.size;
    const hasViteProcess = !!viteProcess;

    // Update menu items
    const statusItem = menu.getMenuItemById('terminal-status');
    const processesItem = menu.getMenuItemById('terminal-processes');
    const ptyItem = menu.getMenuItemById('terminal-pty');
    const viteItem = menu.getMenuItemById('terminal-vite');
    const workingDirItem = menu.getMenuItemById('terminal-working-dir');
    const startViteItem = menu.getMenuItemById('terminal-start-vite');
    const stopViteItem = menu.getMenuItemById('terminal-stop-vite');

    if (statusItem) {
      let statusText = 'Status: ';
      if (hasPersistentTerminal) {
        statusText += hasPty ? 'PTY Active' : 'Fallback Active';
      } else {
        statusText += 'Inactive';
      }
      statusItem.label = statusText;
    }

    if (processesItem) {
      processesItem.label = `Processes: ${processCount}`;
    }

    if (ptyItem) {
      ptyItem.label = `PTY: ${hasPty ? '✓ Available' : '✗ Not Available'}`;
    }

    if (viteItem) {
      viteItem.label = `Vite: ${hasViteProcess ? '✓ Running' : '✗ Stopped'}`;
    }

    if (workingDirItem) {
      workingDirItem.label = `Working Dir: ${lastViteFolder || 'None'}`;
    }

    if (startViteItem) {
      startViteItem.enabled = !!lastViteFolder;
    }

    if (stopViteItem) {
      stopViteItem.enabled = !!viteProcess;
    }

    // Force menu refresh
    Menu.setApplicationMenu(menu);
  } catch (err) {
    console.error('Failed to update menu status:', err);
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

  // Test PTY functionality on startup (lazy load)
  console.log('🧪 Testing PTY functionality on startup...');
  const testPty = loadPTY();
  if (testPty) {
    try {
      const shell = process.platform === 'win32' ? 'powershell.exe' : (process.env.SHELL || '/bin/zsh');
      console.log('Testing PTY with shell:', shell);
      
      const ptyInstance = testPty.spawn(shell, [], {
        name: 'xterm-color',
        cwd: process.cwd(),
        env: process.env
      });
      
      // Wait a bit for shell to be ready, then send test command
      setTimeout(() => {
        ptyInstance.write('echo "PTY test successful"\r');
      }, 1000);
      
      let testOutput = '';
      ptyInstance.onData((data) => {
        testOutput += data;
        if (testOutput.includes('PTY test successful')) {
          console.log('✅ PTY test successful - terminal features will work');
          ptyInstance.kill();
        }
      });
      
      // Kill test after 15 seconds
      setTimeout(() => {
        if (!ptyInstance.killed) {
          ptyInstance.kill();
          console.log('⚠️  PTY test timed out - but continuing anyway');
        }
      }, 15000);
      
      // Also handle PTY errors gracefully
      ptyInstance.onExit(({ exitCode }) => {
        if (exitCode !== 0) {
          console.log('⚠️  PTY test exited with code', exitCode, '- but continuing anyway');
        }
      });
      
    } catch (err) {
      console.error('❌ PTY test failed:', err.message);
    }
  } else {
    console.log('⚠️  No PTY available - terminal features will be limited');
  }

  createWindow();
  createMenu();

  // Set up periodic menu status updates
  setInterval(updateMenuStatus, 2000);
  
  // Initial menu status update
  updateMenuStatus();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Cleanup function to terminate all processes
function cleanupAllProcesses() {
  // Clean up agent processes
  for (const [runId, child] of agentProcs.entries()) {
    try {
      if (typeof child.kill === 'function') {
        child.kill('SIGTERM');
      } else if (child.pid) {
        process.kill(child.pid, 'SIGTERM');
      }
    } catch (err) {
      console.warn(`Failed to kill agent process ${runId}:`, err.message);
    }
  }
  agentProcs.clear();
  
  // Clean up persistent terminal
  if (persistentTerminal) {
    try {
      if (typeof persistentTerminal.kill === 'function') {
        persistentTerminal.kill('SIGTERM');
      }
    } catch (err) {
      console.warn('Failed to kill persistent terminal:', err.message);
    }
    persistentTerminal = null;
  }
  
  // Clean up vite process
  if (viteProcess) {
    try {
      stopVite(viteProcess);
    } catch (err) {
      console.warn('Failed to stop vite process:', err.message);
    }
    viteProcess = null;
  }
  
  // Update menu after cleanup
  updateMenuStatus();
}

app.on('window-all-closed', () => {
  cleanupAllProcesses();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  cleanupAllProcesses();
});

app.on('will-quit', () => {
  cleanupAllProcesses();
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

// Signal handlers for graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  cleanupAllProcesses();
  app.quit();
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  cleanupAllProcesses();
  app.quit();
});

// IPC handlers
ipcMain.handle('select-folder', async () => {
  const res = await dialog.showOpenDialog(win, {
    properties: ['openDirectory']
  });
  if (res.canceled || res.filePaths.length === 0) return null;
  return res.filePaths[0];
});

ipcMain.handle('folder-selected', async () => {
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
  // Stop internal HTML server if running
  if (htmlServerRef && htmlServerRef.stop) {
    try { htmlServerRef.stop(); } catch {}
    htmlServerRef = null;
  }
  const result = await startVite(folderPath, manager || 'yarn', (level, line) => {
    try { if (win && !win.isDestroyed()) win.webContents.send('vite-log', { level, line, ts: Date.now() }); } catch {}
  });
  const { child, urlPromise } = result || {};
  viteProcess = child || null;
  lastViteFolder = folderPath;
  const resolvedUrl = urlPromise ? await urlPromise : null;
  const url = typeof resolvedUrl === 'string' ? resolvedUrl.replace('0.0.0.0', 'localhost') : resolvedUrl;
  updateMenuStatus(); // Update menu after starting Vite
  return { url };
});

ipcMain.handle('vite-stop', async () => {
  if (viteProcess) {
    await stopVite(viteProcess);
    viteProcess = null;
    updateMenuStatus(); // Update menu after stopping Vite
  }
  return true;
});

// Start/Stop internal HTML server for plain HTML projects
ipcMain.handle('html-start', async (_e, { folderPath }) => {
  if (!folderPath) throw new Error('No folderPath provided');
  // Stop vite if running
  if (viteProcess) {
    try { await stopVite(viteProcess); } catch {}
    viteProcess = null;
  }
  // Stop existing html server
  if (htmlServerRef && htmlServerRef.stop) {
    try { htmlServerRef.stop(); } catch {}
    htmlServerRef = null;
  }
  const server = startHtmlServer(folderPath, (level, line) => {
    try { if (win && !win.isDestroyed()) win.webContents.send('vite-log', { level, line, ts: Date.now() }); } catch {}
  });
  htmlServerRef = server;
  lastViteFolder = folderPath;
  const url = await server.urlPromise;
  updateMenuStatus();
  return { url };
});

ipcMain.handle('html-stop', async () => {
  if (htmlServerRef && htmlServerRef.stop) {
    try { htmlServerRef.stop(); } catch {}
    htmlServerRef = null;
    updateMenuStatus();
  }
  return true;
});

ipcMain.handle('cursor-run', async (_e, { message, cwd, runId: clientRunId, sessionId, model, timeoutMs, apiKey }) => {
  if (!message || !message.trim()) {
    throw new Error('Empty message');
  }
  const runId = clientRunId || `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  const workingDir = cwd || lastViteFolder || process.cwd();
  
  // Verify the working directory exists and is accessible
  try {
    const fs = require('fs');
    if (!fs.existsSync(workingDir)) {
      throw new Error(`Working directory does not exist: ${workingDir}`);
    }
    if (!fs.statSync(workingDir).isDirectory()) {
      throw new Error(`Working directory is not a directory: ${workingDir}`);
    }
  } catch (err) {
    throw new Error(`Invalid working directory: ${err.message}`);
  }
  
  // Clean up any existing process with this runId
  const existingProc = agentProcs.get(runId);
  if (existingProc) {
    try {
      if (typeof existingProc.kill === 'function') {
        existingProc.kill('SIGTERM');
      } else if (existingProc.pid) {
        process.kill(existingProc.pid, 'SIGTERM');
      }
    } catch (err) {
      console.warn('Failed to kill existing process:', err.message);
    }
    agentProcs.delete(runId);
  }
  
  console.log(`🚀 Starting cursor-agent in directory: ${workingDir}`);
  const { child, wait } = startCursorAgent(message, sessionId, (level, line) => {
    try { if (win && !win.isDestroyed()) win.webContents.send('cursor-log', { runId, level, line, ts: Date.now() }); } catch {}
  }, { cwd: workingDir, model, ...(typeof timeoutMs === 'number' ? { timeoutMs } : {}), ...(apiKey ? { apiKey, useTokenAuth: true } : {}) });
  
  if (child) agentProcs.set(runId, child);
  
  // Update menu to show new process
  updateMenuStatus();
  
  let resultJson;
  try {
    resultJson = await wait;
  } catch (error) {
    console.error('Cursor agent error:', error);
    // Clean up on error
    if (child) {
      try {
        if (typeof child.kill === 'function') {
          child.kill('SIGTERM');
        } else if (child.pid) {
          process.kill(child.pid, 'SIGTERM');
        }
      } catch (err) {
        console.warn('Failed to kill process on error:', err.message);
      }
    }
    throw error;
  } finally {
    // Always clean up
    if (child) {
      try {
        if (typeof child.kill === 'function') {
          child.kill('SIGTERM');
        } else if (child.pid) {
          process.kill(child.pid, 'SIGTERM');
        }
      } catch (err) {
        console.warn('Failed to kill process in cleanup:', err.message);
      }
    }
    agentProcs.delete(runId);
    // Update menu after cleanup
    updateMenuStatus();
  }
  
  const enriched = { ...resultJson, message, runId };
  history.push(enriched);
  return enriched;
});

ipcMain.handle('get-working-directory', async () => {
  return lastViteFolder || process.cwd();
});

ipcMain.handle('get-app-info', async () => {
  try {
    return {
      isPackaged: app.isPackaged === true,
      env: {
        NODE_ENV: process.env.NODE_ENV || null,
        ELECTRON_IS_DEV: process.env.ELECTRON_IS_DEV || null
      }
    };
  } catch (err) {
    return { isPackaged: false, env: {}, error: err.message };
  }
});

ipcMain.handle('set-working-directory', async (_e, path) => {
  try {
    const fs = require('fs');
    if (!fs.existsSync(path)) {
      throw new Error(`Directory does not exist: ${path}`);
    }
    if (!fs.statSync(path).isDirectory()) {
      throw new Error(`Path is not a directory: ${path}`);
    }
    lastViteFolder = path;
    updateMenuStatus();
    return { success: true, path };
  } catch (err) {
    throw new Error(`Failed to set working directory: ${err.message}`);
  }
});

ipcMain.handle('cursor-input', async (_e, { runId, data }) => {
  // Try to send to specific agent process first
  if (runId) {
    const child = agentProcs.get(runId);
    if (child) {
      try {
        if (typeof child.write === 'function') {
          child.write(String(data));
          return true;
        }
        if (child.stdin && typeof child.stdin.write === 'function') {
          child.stdin.write(String(data));
          return true;
        }
      } catch {}
    }
  }
  
  // If no agent running or runId not found, use persistent terminal
  if (!persistentTerminal) {
    const ptyModule = loadPTY();
    if (!ptyModule) {
      console.warn('node-pty not available, using fallback terminal');
      // Create a simple fallback terminal using child_process
      try {
        const shell = process.platform === 'win32' ? 'powershell.exe' : (process.env.SHELL || '/bin/zsh');
        console.log('Creating fallback terminal with shell:', shell);
        
        const child = spawn(shell, [], {
          cwd: lastViteFolder || process.cwd(),
          env: process.env,
          stdio: ['pipe', 'pipe', 'pipe']
        });
        
        // Add timeout to prevent hanging
        const terminalTimeout = setTimeout(() => {
          if (child && !child.killed) {
            console.warn('Fallback terminal timeout, killing process');
            try {
              child.kill('SIGTERM');
            } catch (err) {
              console.error('Failed to kill timed out terminal:', err);
            }
            persistentTerminal = null;
          }
        }, 300000); // 5 minutes
        
        persistentTerminal = {
          write: (data) => {
            try {
              if (child && !child.killed) {
                child.stdin.write(data);
              }
            } catch (err) {
              console.error('Fallback terminal write error:', err);
            }
          },
          kill: (signal) => {
            try {
              clearTimeout(terminalTimeout);
              if (child && !child.killed) {
                child.kill(signal);
              }
            } catch (err) {
              console.error('Fallback terminal kill error:', err);
            }
            persistentTerminal = null;
          }
        };
        
        // Forward output
        child.stdout.on('data', (data) => {
          try {
            if (win && !win.isDestroyed()) {
              win.webContents.send('cursor-log', { 
                runId: 'persistent', 
                level: 'info', 
                line: data.toString(), 
                ts: Date.now() 
              });
            }
          } catch {}
        });
        
        child.stderr.on('data', (data) => {
          try {
            if (win && !win.isDestroyed()) {
              win.webContents.send('cursor-log', { 
                runId: 'persistent', 
                level: 'error', 
                line: data.toString(), 
                ts: Date.now() 
              });
            }
          } catch {}
        });
        
        child.on('exit', (code) => {
          console.log('Fallback terminal exited with code:', code);
          clearTimeout(terminalTimeout);
          persistentTerminal = null;
          // Update menu after terminal cleanup
          updateMenuStatus();
        });
        
        child.on('error', (err) => {
          console.error('Fallback terminal error:', err);
          clearTimeout(terminalTimeout);
          persistentTerminal = null;
          // Update menu after terminal cleanup
          updateMenuStatus();
        });
        
        console.log('Fallback terminal created successfully');
        // Update menu to show terminal status
        updateMenuStatus();
      } catch (err) {
        console.error('Failed to create fallback terminal:', err);
        return false;
      }
    } else {
      try {
        const shell = process.platform === 'win32' ? 'powershell.exe' : (process.env.SHELL || '/bin/zsh');
        console.log('Creating persistent terminal with shell:', shell);
        persistentTerminal = ptyModule.spawn(shell, [], {
          name: 'xterm-color',
          cwd: lastViteFolder || process.cwd(),
          env: process.env
        });
        
        // Add timeout to prevent hanging
        const terminalTimeout = setTimeout(() => {
          if (persistentTerminal) {
            console.warn('Persistent terminal timeout, killing process');
            try {
              persistentTerminal.kill('SIGTERM');
            } catch (err) {
              console.error('Failed to kill timed out terminal:', err);
            }
            persistentTerminal = null;
          }
        }, 300000); // 5 minutes
        
        console.log('Persistent terminal created successfully');
        // Update menu to show terminal status
        updateMenuStatus();
        
        // Forward persistent terminal output to renderer
        persistentTerminal.onData((data) => {
          try {
            if (win && !win.isDestroyed()) {
              win.webContents.send('cursor-log', { 
                runId: 'persistent', 
                level: 'info', 
                line: data.toString(), 
                ts: Date.now() 
              });
            }
          } catch {}
        });
        
        persistentTerminal.onExit(({ exitCode }) => {
          console.log('Persistent terminal exited with code:', exitCode);
          clearTimeout(terminalTimeout);
          persistentTerminal = null;
          // Update menu after terminal cleanup
          updateMenuStatus();
        });
        
        persistentTerminal.onError((err) => {
          console.error('Persistent terminal error:', err);
          clearTimeout(terminalTimeout);
          persistentTerminal = null;
          // Update menu after terminal cleanup
          updateMenuStatus();
        });
      } catch (err) {
        console.error('Failed to create persistent terminal:', err);
        return false;
      }
    }
  }
  
  if (persistentTerminal) {
    persistentTerminal.write(String(data));
    return true;
  }
  
  return false;
});

// --------------------
// Git helpers & IPC
// --------------------
function runCommand(command, args, cwd) {
  return new Promise((resolve) => {
    try {
      const child = spawn(command, args, {
        cwd,
        shell: process.platform === 'win32',
        env: process.env,
      });
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (d) => { stdout += d.toString(); });
      child.stderr.on('data', (d) => { stderr += d.toString(); });
      child.on('error', (err) => resolve({ ok: false, code: -1, stdout, stderr: (stderr || '') + String(err.message || err) }));
      child.on('exit', (code) => resolve({ ok: code === 0, code, stdout, stderr }));
    } catch (err) {
      resolve({ ok: false, code: -1, stdout: '', stderr: String(err.message || err) });
    }
  });
}

async function isGitRepo(cwd) {
  const res = await runCommand('git', ['rev-parse', '--is-inside-work-tree'], cwd);
  return res.ok && /true/.test(res.stdout.trim());
}

async function ensureGitRepo(cwd) {
  if (await isGitRepo(cwd)) return { ok: true };
  // Initialize repository. Prefer initializing default branch to main if supported
  let res = await runCommand('git', ['init'], cwd);
  if (!res.ok) return { ok: false, error: res.stderr || res.stdout || 'git init failed' };
  // Try to create/switch to main to be consistent
  await runCommand('git', ['checkout', '-B', 'main'], cwd);
  return { ok: true };
}

async function getCurrentBranch(cwd) {
  const res = await runCommand('git', ['rev-parse', '--abbrev-ref', 'HEAD'], cwd);
  if (!res.ok) return null;
  const name = res.stdout.trim();
  if (!name || name === 'HEAD') return null;
  return name;
}

async function getCurrentUpstream(cwd) {
  // Returns upstream ref like origin/main, or null if none
  const res = await runCommand('git', ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'], cwd);
  if (!res.ok) return null;
  const up = (res.stdout || '').trim();
  return up || null;
}

async function listBranches(cwd) {
  const repo = await isGitRepo(cwd);
  if (!repo) return { ok: true, isRepo: false, branches: [], current: null };
  const res = await runCommand('git', ['branch', '--format=%(refname:short)'], cwd);
  if (!res.ok) return { ok: false, error: res.stderr || res.stdout, isRepo: true, branches: [], current: await getCurrentBranch(cwd) };
  const branches = res.stdout
    .split(/\r?\n/)
    .map((s) => s.trim().replace(/^\*\s*/, ''))
    .filter(Boolean);
  const current = await getCurrentBranch(cwd);
  const upstream = await getCurrentUpstream(cwd);
  return { ok: true, isRepo: true, branches, current, hasUpstream: !!upstream, upstream };
}

async function checkoutBranch(cwd, branchName, createIfMissing) {
  if (!branchName) return { ok: true };
  if (createIfMissing) {
    const res = await runCommand('git', ['checkout', '-B', branchName], cwd);
    if (!res.ok) return { ok: false, error: res.stderr || res.stdout };
    return { ok: true };
  }
  const res = await runCommand('git', ['checkout', branchName], cwd);
  if (!res.ok) return { ok: false, error: res.stderr || res.stdout };
  return { ok: true };
}

async function hasChangesToCommit(cwd) {
  const res = await runCommand('git', ['status', '--porcelain'], cwd);
  if (!res.ok) return false;
  return res.stdout.trim().length > 0;
}

ipcMain.handle('git-branches', async (_e, { folderPath }) => {
  try {
    if (!folderPath) throw new Error('No folderPath provided');
    if (!fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) {
      throw new Error('Folder does not exist or is not a directory');
    }
    return await listBranches(folderPath);
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('git-commit', async (_e, { folderPath, message, mode, branchName }) => {
  // mode: 'existing' | 'new' | undefined
  try {
    if (!folderPath) throw new Error('No folderPath provided');
    if (!message || !String(message).trim()) throw new Error('Commit message required');
    if (!fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) {
      throw new Error('Folder does not exist or is not a directory');
    }

    const ensured = await ensureGitRepo(folderPath);
    if (!ensured.ok) return { ok: false, error: ensured.error };

    // Switch/create branch if requested
    if (mode === 'new' && branchName) {
      const sw = await checkoutBranch(folderPath, branchName, true);
      if (!sw.ok) return { ok: false, error: sw.error };
    } else if (mode === 'existing' && branchName) {
      const cur = await getCurrentBranch(folderPath);
      if (cur !== branchName) {
        const sw = await checkoutBranch(folderPath, branchName, false);
        if (!sw.ok) return { ok: false, error: sw.error };
      }
    }

    // Stage all changes
    const addRes = await runCommand('git', ['add', '-A'], folderPath);
    if (!addRes.ok) return { ok: false, error: addRes.stderr || addRes.stdout };

    // No-op if nothing to commit
    if (!(await hasChangesToCommit(folderPath))) {
      return { ok: true, message: 'No changes to commit' };
    }

    const commitRes = await runCommand('git', ['commit', '-m', String(message)], folderPath);
    if (!commitRes.ok) return { ok: false, error: commitRes.stderr || commitRes.stdout };

    const current = await getCurrentBranch(folderPath);
    return { ok: true, branch: current, output: commitRes.stdout };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('git-reflog', async (_e, { folderPath, limit = 50 }) => {
  try {
    if (!folderPath) throw new Error('No folderPath provided');
    if (!fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) {
      throw new Error('Folder does not exist or is not a directory');
    }
    if (!(await isGitRepo(folderPath))) {
      return { ok: true, entries: [] };
    }
    const res = await runCommand('git', ['log', '-g', `-n`, String(limit), '--date=iso', '--pretty=%h%x09%cd%x09%s'], folderPath);
    if (!res.ok) return { ok: false, error: res.stderr || res.stdout };
    const lines = res.stdout.split(/\r?\n/).filter(Boolean);
    const entries = lines.map((line) => {
      const [sha, date, message] = line.split('\t');
      return { sha: (sha || '').trim(), date: (date || '').trim(), message: (message || '').trim() };
    }).filter(e => e.sha);
    return { ok: true, entries };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('git-restore-local', async (_e, { folderPath, action, sha }) => {
  try {
    if (!folderPath) throw new Error('No folderPath provided');
    if (!sha) throw new Error('Missing commit sha');
    if (!fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) {
      throw new Error('Folder does not exist or is not a directory');
    }
    if (!(await isGitRepo(folderPath))) {
      return { ok: false, error: 'Not a git repository' };
    }
    let result;
    switch (action) {
      case 'reset-hard': {
        // Disallow reset on branches that have been pushed to an upstream to avoid conflicts
        const upstream = await getCurrentUpstream(folderPath);
        if (upstream) {
          return { ok: false, error: `Reset blocked: current branch tracks ${upstream}. Avoid rewriting pushed history.` };
        }
        // Reset current branch to sha (destructive)
        result = await runCommand('git', ['reset', '--hard', sha], folderPath);
        if (!result.ok) return { ok: false, error: result.stderr || result.stdout };
        const cur = await getCurrentBranch(folderPath);
        return { ok: true, branch: cur };
      }
      default:
        return { ok: false, error: 'Unsupported action' };
    }
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('cursor-signal', async (_e, { runId, signal }) => {
  // Try to send signal to specific agent process first
  if (runId && runId !== 'persistent') {
    const child = agentProcs.get(runId);
    if (child) {
      try {
        if (typeof child.write === 'function' && signal === 'SIGINT') {
          child.write('\u0003'); // Ctrl+C
          return true;
        }
        if (typeof child.kill === 'function') {
          child.kill(signal || 'SIGINT');
          return true;
        }
      } catch {}
    }
  }
  
  // Send signal to persistent terminal
  if (persistentTerminal) {
    try {
      if (signal === 'SIGINT') {
        persistentTerminal.write('\u0003'); // Ctrl+C
        return true;
      }
      if (typeof persistentTerminal.kill === 'function') {
        persistentTerminal.kill(signal || 'SIGINT');
        return true;
      }
    } catch {}
  }
  
  return false;
});

// Debug handler to test terminal status
ipcMain.handle('terminal-status', async () => {
  const ptyModule = loadPTY();
  return {
    hasPty: !!ptyModule,
    hasPersistentTerminal: !!persistentTerminal,
    terminalType: persistentTerminal ? (ptyModule ? 'pty' : 'fallback') : 'none',
    activeProcesses: Array.from(agentProcs.keys()),
    processCount: agentProcs.size,
    lastViteFolder,
    hasViteProcess: !!viteProcess
  };
});

// Debug handler to force cleanup all processes
ipcMain.handle('terminal-cleanup', async () => {
  const beforeCount = agentProcs.size;
  cleanupAllProcesses();
  // Note: cleanupAllProcesses already calls updateMenuStatus()
  return {
    message: 'Forced cleanup completed',
    processesCleaned: beforeCount,
    currentProcessCount: agentProcs.size
  };
});

ipcMain.handle('history-get', async () => {
  return history.read();
});

ipcMain.handle('history-clear', async () => {
  history.clear();
  return [];
});

// --------------------
// Cursor auth helpers & IPC
// --------------------
function runCursorAgentRaw(args, onData) {
  return new Promise((resolve) => {
    try {
      const env = { ...process.env };
      env.PATH = ensureDarwinPath(env.PATH);
      const resolved = resolveCommandPath('cursor-agent', env.PATH) || 'cursor-agent';
      const child = spawn(resolved, args, { shell: process.platform === 'win32', env });
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (d) => {
        const s = d.toString();
        stdout += s;
        if (onData) onData(s, 'stdout');
      });
      child.stderr.on('data', (d) => {
        const s = d.toString();
        stderr += s;
        if (onData) onData(s, 'stderr');
      });
      child.on('error', (err) => resolve({ ok: false, code: -1, stdout, stderr: (stderr || '') + String(err.message || err) }));
      child.on('exit', (code) => resolve({ ok: code === 0, code, stdout, stderr }));
    } catch (err) {
      resolve({ ok: false, code: -1, stdout: '', stderr: String(err.message || err) });
    }
  });
}

ipcMain.handle('cursor-auth-status', async () => {
  const res = await runCursorAgentRaw(['status']);
  const clean = `${stripAnsi(res.stdout)}\n${stripAnsi(res.stderr)}`;
  const out = clean.toLowerCase();
  // Explicitly handle negative case first to avoid matching "logged in" inside "not logged in"
  const isExplicitlyLoggedOut = /\bnot\s+logged\s+in\b/.test(out);
  const isExplicitlyLoggedIn = /\blogged\s+in\b/.test(out) || /\blogin\s+successful\b/.test(out);
  const loggedIn = isExplicitlyLoggedOut ? false : (isExplicitlyLoggedIn ? true : false);
  return { ok: true, loggedIn, raw: { stdout: res.stdout, stderr: res.stderr } };
});

ipcMain.handle('cursor-auth-login', async () => {
  const linkRegex = /(https?:\/\/[^\s]+)/ig;
  const onData = (chunk) => {
    try { if (win && !win.isDestroyed()) win.webContents.send('cursor-auth-log', { line: chunk, ts: Date.now() }); } catch {}
    // Best-effort link detection
    let m;
    while ((m = linkRegex.exec(chunk)) !== null) {
      const url = m[1];
      try { if (win && !win.isDestroyed()) win.webContents.send('cursor-auth-link', { url, ts: Date.now() }); } catch {}
    }
  };
  const res = await runCursorAgentRaw(['login'], onData);
  const out = `${stripAnsi(res.stdout)}\n${stripAnsi(res.stderr)}`.toLowerCase();
  const success = res.ok || /login successful/.test(out) || /authentication tokens stored securely/.test(out);
  return { ok: res.ok, success, raw: { stdout: res.stdout, stderr: res.stderr } };
});

// Emit a manual log line into the cursor log stream (for debug)
ipcMain.handle('cursor-debug-log', async (_e, { line, runId, level }) => {
  try {
    const payload = { line: String(line || ''), ts: Date.now(), ...(runId ? { runId } : {}), ...(level ? { level } : {}) };
    if (win && !win.isDestroyed()) {
      win.webContents.send('cursor-log', payload);
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// Detect project metadata from a folder
ipcMain.handle('project-detect', async (_e, folderPath) => {
  try {
    if (!folderPath) throw new Error('No folder provided');
    if (!fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) {
      throw new Error('Folder does not exist or is not a directory');
    }

    const result = {
      hasPackageJson: false,
      packageJson: null,
      hasIndexHtml: false,
      indexHtmlPath: null,
      scripts: {},
      name: null,
      description: null,
      defaultScriptKey: null,
    };

    const pkgPath = path.join(folderPath, 'package.json');
    if (fs.existsSync(pkgPath) && fs.statSync(pkgPath).isFile()) {
      try {
        const raw = fs.readFileSync(pkgPath, 'utf8');
        const json = JSON.parse(raw);
        result.hasPackageJson = true;
        result.packageJson = json;
        result.scripts = json.scripts || {};
        result.name = json.name || null;
        result.description = json.description || null;
      } catch (err) {
        // If parse fails, still mark file existence but no data
        result.hasPackageJson = true;
      }
    }

    // Look for index.html in common locations
    const candidatePaths = [
      'index.html',
      path.join('public', 'index.html'),
      path.join('src', 'index.html')
    ];
    for (const rel of candidatePaths) {
      const full = path.join(folderPath, rel);
      if (fs.existsSync(full) && fs.statSync(full).isFile()) {
        result.hasIndexHtml = true;
        result.indexHtmlPath = full;
        break;
      }
    }

    // Determine project type
    let projectType = null;
    if (result.hasPackageJson) {
      const scripts = result.scripts || {};
      const values = Object.values(scripts).join(' ').toLowerCase();
      const deps = (result.packageJson.dependencies || {});
      const devDeps = (result.packageJson.devDependencies || {});
      const allDeps = { ...deps, ...devDeps };

      const hasNext = 'next' in allDeps || values.includes('next');
      const hasVite = 'vite' in allDeps || values.includes('vite');

      if (hasNext) projectType = 'next';
      else if (hasVite) projectType = 'vite';
      else projectType = 'node';

      // Pick default development script key
      const lower = Object.fromEntries(Object.entries(scripts).map(([k, v]) => [k, String(v).toLowerCase()]));
      const keys = Object.keys(lower);

      const findFirst = (predicate) => keys.find((k) => predicate(k, lower[k]));

      if (projectType === 'vite') {
        result.defaultScriptKey = (lower.dev && lower.dev.includes('vite')) ? 'dev' :
          findFirst((_k, v) => v.includes('vite') && (v.includes('dev') || v.includes('serve'))) ||
          (lower.dev ? 'dev' : null);
      } else if (projectType === 'next') {
        result.defaultScriptKey = lower.dev && (lower.dev.includes('next') || lower.dev.includes('next dev')) ? 'dev' :
          findFirst((_k, v) => v.includes('next dev') || v.includes('next')) ||
          (lower.dev ? 'dev' : null);
      } else {
        // Generic node app: prefer dev, fall back to start
        result.defaultScriptKey = lower.dev ? 'dev' : (lower.start ? 'start' : null);
      }
    } else if (result.hasIndexHtml) {
      projectType = 'html';
    }

    return { ok: true, data: { ...result, projectType } };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// Open folder in the OS file manager
ipcMain.handle('open-folder', async (_e, folderPath) => {
  try {
    if (!folderPath) throw new Error('No folderPath provided');
    const res = await shell.openPath(folderPath);
    if (res) return { ok: false, error: res };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// Detect available editors in PATH
ipcMain.handle('detect-editors', async () => {
  const candidates = [
    { id: 'code', cmd: 'code', args: ['--version'] },
    { id: 'cursor', cmd: 'cursor', args: ['--version'] },
    { id: 'webstorm', cmd: 'webstorm', args: ['--version'] },
    { id: 'idea', cmd: 'idea', args: ['--version'] },
    { id: 'subl', cmd: 'subl', args: ['--version'] }
  ];
  const available = [];
  await Promise.all(candidates.map(c => new Promise((resolve) => {
    try {
      const child = spawn(c.cmd, c.args, { stdio: 'ignore', shell: process.platform === 'win32' });
      child.on('exit', (code) => { if (code === 0 || code === 1) available.push(c.id); resolve(); });
      child.on('error', () => resolve());
    } catch { resolve(); }
  })));
  return available;
});

// Open project in a specific editor
ipcMain.handle('open-in-editor', async (_e, { folderPath, editor, targetPath }) => {
  try {
    if (!folderPath) throw new Error('No folderPath provided');
    const map = {
      code: { cmd: 'code' },
      cursor: { cmd: 'cursor' },
      webstorm: { cmd: 'webstorm' },
      idea: { cmd: 'idea' },
      subl: { cmd: 'subl' }
    };
    const entry = map[editor];
    if (!entry) throw new Error('Unsupported editor');
    const args = [];
    if (targetPath && typeof targetPath === 'string') {
      args.push(targetPath);
    } else {
      args.push('.');
    }
    const child = spawn(entry.cmd, args, { cwd: folderPath, shell: process.platform === 'win32' });
    child.on('error', () => {});
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// Open URL in default browser
ipcMain.handle('open-external', async (_e, url) => {
  try {
    if (!url) throw new Error('No URL provided');
    const { shell } = require('electron');
    await shell.openExternal(url);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// Compute simple project routes by scanning file structure
ipcMain.handle('project-routes', async (_e, { folderPath, projectType }) => {
  try {
    if (!folderPath) throw new Error('No folderPath provided');
    const ignore = ['node_modules', '.git', 'dist', 'build', '.next', 'out'];
    const routes = new Set();
    function walk(dir) {
      for (const name of fs.readdirSync(dir)) {
        if (ignore.includes(name)) continue;
        const full = path.join(dir, name);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) walk(full);
        else {
          if (projectType === 'html') {
            if (name.endsWith('.html')) {
              const rel = path.relative(folderPath, full).replace(/\\/g, '/');
              let route = '/' + rel.replace(/index\.html$/i, '').replace(/\.html$/i, '');
              if (route.endsWith('/')) route = route.slice(0, -1) || '/';
              routes.add(route || '/');
            }
          } else {
            // Next.js app/pages or vite src/pages heuristic
            const rel = path.relative(folderPath, full).replace(/\\/g, '/');
            if (/^app\/.+\/page\.(t|j)sx?$/.test(rel)) {
              const p = rel.replace(/^app\//, '').replace(/\/page\.(t|j)sx?$/,'');
              routes.add('/' + p);
            }
            if (/^pages\/.+\.(t|j)sx?$/.test(rel)) {
              let p = rel.replace(/^pages\//, '').replace(/\.(t|j)sx?$/,'');
              p = p.replace(/index$/,'');
              routes.add('/' + p);
            }
            if (/^src\/pages\/.+\.(t|j)sx?$/.test(rel)) {
              let p = rel.replace(/^src\/pages\//, '').replace(/\.(t|j)sx?$/,'');
              p = p.replace(/index$/,'');
              routes.add('/' + p);
            }
          }
        }
      }
    }
    walk(folderPath);
    const out = Array.from(routes).map(r => r.replace(/\/+/g,'/')).map(r => r || '/');
    const unique = Array.from(new Set(out)).sort();
    return { ok: true, routes: unique };
  } catch (err) {
    return { ok: false, error: err.message, routes: [] };
  }
});

// Install packages via yarn/pnpm/npm in a given folder
ipcMain.handle('packages-install', async (_e, { folderPath, manager = 'yarn' }) => {
  try {
    if (!folderPath) throw new Error('No folderPath provided');
    if (!fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) {
      throw new Error('Folder does not exist or is not a directory');
    }

    // Normalize manager and args, forcing devDependencies to be installed even if NODE_ENV=production
    const isNpm = manager === 'npm';
    const isPnpm = manager === 'pnpm';
    const cmd = isNpm ? 'npm' : isPnpm ? 'pnpm' : 'yarn';

    // Default install args per manager
    const args = isNpm
      ? ['install', '--include=dev'] // ensure dev deps
      : isPnpm
        ? ['install', '--prod=false'] // include dev deps
        : ['install', '--production=false']; // yarn classic

    // Ensure environment variables do not prune devDependencies
    const env = { ...process.env };
    env.NODE_ENV = 'development';
    // Yarn classic respects YARN_PRODUCTION
    env.YARN_PRODUCTION = 'false';
    // npm/pnpm respect npm_config_production
    env.npm_config_production = 'false';

    // Ensure local project binaries are on PATH when installing (for postinstall scripts etc.)
    try {
      const localBin = path.join(folderPath, 'node_modules', '.bin');
      if (fs.existsSync(localBin)) {
        const basePath = process.env.PATH || '';
        env.PATH = `${localBin}:${basePath}`;
      }
    } catch {}

    const child = spawn(cmd, args, {
      cwd: folderPath,
      shell: process.platform === 'win32',
      env
    });

    return await new Promise((resolve) => {
      child.on('exit', (code) => {
        if (code === 0) resolve({ ok: true });
        else resolve({ ok: false, error: `${cmd} ${args.join(' ')} exited with code ${code}` });
      });
      child.on('error', (err) => resolve({ ok: false, error: err.message }));
    });
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// Create a new project scaffold directory with project-setup.md
ipcMain.handle('project-create', async (_e, { parentDir, projectName, template, prompt }) => {
  try {
    if (!parentDir || !projectName) throw new Error('Missing parentDir or projectName');
    if (!fs.existsSync(parentDir) || !fs.statSync(parentDir).isDirectory()) {
      throw new Error('Parent directory does not exist or is not a directory');
    }
    const safeName = projectName.replace(/[^a-zA-Z0-9-_]/g, '-');
    const targetDir = path.join(parentDir, safeName);
    if (fs.existsSync(targetDir)) {
      throw new Error('Target folder already exists');
    }
    fs.mkdirSync(targetDir, { recursive: true });
    const md = `# Project Setup\n\n- Name: ${projectName}\n- Template: ${template}\n- Created: ${new Date().toISOString()}\n\n## Prompt\n\n${prompt || ''}\n`;
    fs.writeFileSync(path.join(targetDir, 'project-setup.md'), md, 'utf8');
    return { ok: true, path: targetDir };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});
