#!/usr/bin/env node

// This script tests PTY functionality within the actual Electron context
// Run it with: npx electron test-electron-pty-electron.js

const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;
let ptyTestResult = null;

// Test PTY functionality
function testPTY() {
  try {
    console.log('🔍 Testing PTY in Electron context...');
    console.log('Electron version:', process.versions.electron);
    console.log('Electron ABI version:', process.versions.modules);
    console.log('Platform:', process.platform);
    console.log('Architecture:', process.arch);
    
    // Try to load the PTY module
    const pty = require('node-pty-prebuilt-multiarch');
    console.log('✅ node-pty-prebuilt-multiarch loaded successfully');
    
    // Test basic functionality
    const shell = process.platform === 'win32' ? 'powershell.exe' : (process.env.SHELL || '/bin/zsh');
    console.log('Shell:', shell);
    
    try {
      const p = pty.spawn(shell, [], {
        name: 'xterm-color',
        cwd: process.cwd(),
        env: process.env
      });
      console.log('✅ PTY spawn successful');
      
      // Test basic write/read
      p.write('echo "Hello from PTY"\r');
      
      let output = '';
      let dataReceived = false;
      
      p.onData((data) => {
        output += data;
        if (output.includes('Hello from PTY') && !dataReceived) {
          dataReceived = true;
          console.log('✅ PTY data handling working');
          ptyTestResult = { success: true, message: 'PTY test completed successfully' };
          p.kill();
        }
      });
      
      p.onExit(({ exitCode }) => {
        console.log('✅ PTY exit handling working, exit code:', exitCode);
        if (!ptyTestResult) {
          ptyTestResult = { success: true, message: 'PTY test completed successfully' };
        }
      });
      
      // Timeout after 10 seconds
      setTimeout(() => {
        if (!p.killed) {
          p.kill();
          if (!dataReceived) {
            console.log('⚠️  PTY test timed out');
            ptyTestResult = { success: false, message: 'PTY test timed out' };
          }
        }
      }, 10000);
      
    } catch (err) {
      console.log('❌ PTY spawn failed:', err.message);
      ptyTestResult = { success: false, message: `PTY spawn failed: ${err.message}` };
    }
    
  } catch (err) {
    console.log('❌ Failed to load node-pty-prebuilt-multiarch:', err.message);
    ptyTestResult = { success: false, message: `Failed to load PTY: ${err.message}` };
  }
}

// Create the main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Load a simple HTML page
  mainWindow.loadURL('data:text/html,<html><body><h1>PTY Test Running...</h1><p>Check the console for results</p></body></html>');
  
  // Start the PTY test
  testPTY();
  
  // Wait a bit for the test to complete, then show results
  setTimeout(() => {
    if (ptyTestResult) {
      const resultHtml = `
        <html>
          <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h1>PTY Test Results</h1>
            <div style="padding: 20px; border: 1px solid #ccc; border-radius: 5px; margin: 20px 0;">
              <h2>${ptyTestResult.success ? '✅ Success' : '❌ Failed'}</h2>
              <p><strong>Message:</strong> ${ptyTestResult.message}</p>
            </div>
            <p><strong>Electron Version:</strong> ${process.versions.electron}</p>
            <p><strong>ABI Version:</strong> ${process.versions.modules}</p>
            <p><strong>Platform:</strong> ${process.platform}</p>
            <p><strong>Architecture:</strong> ${process.arch}</p>
          </body>
        </html>
      `;
      mainWindow.loadURL(`data:text/html,${encodeURIComponent(resultHtml)}`);
    }
  }, 12000);
}

// App event handlers
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Handle app quit
app.on('before-quit', () => {
  console.log('Final PTY test result:', ptyTestResult);
});
