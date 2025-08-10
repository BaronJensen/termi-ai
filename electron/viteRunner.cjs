
const { spawn } = require('child_process');

function parseUrlFromViteOutput(chunk) {
  const text = chunk.toString();
  // Strip ANSI color codes to make regex robust
  const clean = text.replace(/\x1b\[[0-9;]*m/g, '');
  // Support http and https, localhost, 127.0.0.1, 0.0.0.0 and LAN IPs
  const all = [...clean.matchAll(/https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\d{1,3}(?:\.\d{1,3}){3}):\d+\/?/ig)].map(m => m[0]);
  if (all.length) {
    const selected = all[0];
    return selected.endsWith('/') ? selected : `${selected}/`;
  }
  return null;
}

function startVite(folderPath, manager='yarn', onLog) {
  const command = manager === 'npm' ? 'npm' : manager === 'pnpm' ? 'pnpm' : 'yarn';
  const args = manager === 'npm' ? ['run', 'dev'] : ['dev'];

  const child = spawn(command, args, {
    cwd: folderPath,
    shell: process.platform === 'win32', // make it work on Windows too
    env: process.env
  });

  let resolved = false;
  let urlResolve;
  let urlReject;
  const urlPromise = new Promise((res, rej) => { urlResolve = res; urlReject = rej; });

  let logs = '';
  const appendLogs = (data) => {
    logs += data.toString();
    // Keep last ~8000 chars to avoid unbounded memory growth
    if (logs.length > 8000) logs = logs.slice(-8000);
  };

  const onStdout = (data) => {
    appendLogs(data);
    if (onLog) onLog('stdout', data.toString());
    const maybeUrl = parseUrlFromViteOutput(data);
    if (!resolved && maybeUrl) {
      resolved = true;
      urlResolve(maybeUrl);
    }
  };
  const onStderr = (data) => {
    appendLogs(data);
    if (onLog) onLog('stderr', data.toString());
    const maybeUrl = parseUrlFromViteOutput(data);
    if (!resolved && maybeUrl) {
      resolved = true;
      urlResolve(maybeUrl);
    }
  };

  if (onLog) onLog('info', `Running: ${command} ${args.join(' ')}\nCWD: ${folderPath}`);
  child.stdout.on('data', onStdout);
  child.stderr.on('data', onStderr);
  child.on('error', (err) => {
    if (!resolved) urlReject(new Error(`Failed to start dev server: ${err.message}\nCommand: ${command} ${args.join(' ')}\nCWD: ${folderPath}`));
  });
  child.on('exit', (code) => {
    if (!resolved) {
      const context = logs ? `\n--- Output (tail) ---\n${logs}` : '';
      urlReject(new Error(`Vite dev process exited: ${code}${context}`));
    }
    if (onLog) onLog('info', `Dev server exited with code ${code}`);
  });

  return { child, urlPromise };
}

async function stopVite(child) {
  if (!child) return;
  if (process.platform === 'win32') {
    // Try graceful kill
    child.kill();
  } else {
    child.kill('SIGTERM');
  }
}

module.exports = { startVite, stopVite };
