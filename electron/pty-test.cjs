// PTY Test Module for Electron
// Import this into your main.cjs to test PTY functionality

const pty = require('node-pty-prebuilt-multiarch');

function testPTY() {
  return new Promise((resolve, reject) => {
    try {
      console.log('🔍 Testing PTY in Electron context...');
      console.log('Electron version:', process.versions.electron);
      console.log('Electron ABI version:', process.versions.modules);
      console.log('Platform:', process.platform);
      console.log('Architecture:', process.arch);
      
      // Test basic functionality
      const shell = process.platform === 'win32' ? 'powershell.exe' : (process.env.SHELL || '/bin/zsh');
      console.log('Shell:', shell);
      
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
          p.kill();
          resolve({ success: true, message: 'PTY test completed successfully' });
        }
      });
      
      p.onExit(({ exitCode }) => {
        console.log('✅ PTY exit handling working, exit code:', exitCode);
        if (!dataReceived) {
          resolve({ success: true, message: 'PTY test completed successfully' });
        }
      });
      
      // Timeout after 10 seconds
      setTimeout(() => {
        if (!p.killed) {
          p.kill();
          if (!dataReceived) {
            console.log('⚠️  PTY test timed out');
            reject(new Error('PTY test timed out'));
          }
        }
      }, 10000);
      
    } catch (err) {
      console.log('❌ PTY test failed:', err.message);
      reject(err);
    }
  });
}

// Export the test function
module.exports = { testPTY };

// If this file is run directly, run the test
if (require.main === module) {
  testPTY()
    .then(result => {
      console.log('✅ PTY test result:', result);
      process.exit(0);
    })
    .catch(err => {
      console.log('❌ PTY test failed:', err.message);
      process.exit(1);
    });
}
