#!/usr/bin/env node

// Test script to verify PTY loading in Electron context
// This simulates what happens in your main.cjs

console.log('🧪 Testing PTY loading in Electron context...');

// Simulate Electron environment
process.versions.electron = '30.5.1';
process.versions.modules = '123';

console.log('Electron version:', process.versions.electron);
console.log('Electron ABI version:', process.versions.modules);

// Try to load PTY
let pty = null;
let ptyLoadAttempted = false;

function loadPTY() {
  if (ptyLoadAttempted) return pty;
  ptyLoadAttempted = true;
  
  try {
    pty = require('node-pty-prebuilt-multiarch');
    console.log('✅ node-pty-prebuilt-multiarch loaded successfully');
    return pty;
  } catch (err) {
    console.log('❌ node-pty-prebuilt-multiarch failed:', err.message);
    // Try fallback to original node-pty
    try {
      pty = require('node-pty');
      console.log('✅ Fallback node-pty loaded successfully');
      return pty;
    } catch (fallbackErr) {
      console.log('❌ Fallback node-pty also failed:', fallbackErr.message);
      return null;
    }
  }
}

// Test loading
const ptyModule = loadPTY();

if (ptyModule) {
  console.log('✅ PTY module loaded successfully!');
  
  // Test basic functionality
  try {
    const shell = process.platform === 'win32' ? 'powershell.exe' : (process.env.SHELL || '/bin/zsh');
    console.log('Testing PTY with shell:', shell);
    
    const p = ptyModule.spawn(shell, [], {
      name: 'xterm-color',
      cwd: process.cwd(),
      env: process.env
    });
    
    console.log('✅ PTY spawn successful');
    
    // Test basic write/read
    p.write('echo "PTY test successful"\r');
    
    let output = '';
    p.onData((data) => {
      output += data;
      if (output.includes('PTY test successful')) {
        console.log('✅ PTY data handling working');
        p.kill();
        console.log('🎉 All PTY tests passed!');
        process.exit(0);
      }
    });
    
    // Timeout after 10 seconds
    setTimeout(() => {
      if (!p.killed) {
        p.kill();
        console.log('⚠️  PTY test timed out');
        process.exit(1);
      }
    }, 10000);
    
  } catch (err) {
    console.log('❌ PTY spawn failed:', err.message);
    process.exit(1);
  }
  
} else {
  console.log('❌ No PTY module available');
  process.exit(1);
}
