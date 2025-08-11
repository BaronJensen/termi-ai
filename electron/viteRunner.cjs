
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

function ensureDarwinPath(originalPath) {
  if (process.platform !== 'darwin') return originalPath;
  const extras = ['/usr/local/bin', '/opt/homebrew/bin'];
  const parts = (originalPath || '').split(':');
  for (const p of extras) {
    if (!parts.includes(p)) parts.unshift(p);
  }
  return parts.filter(Boolean).join(':');
}

function resolveExecutable(command, envPath) {
  const candidates = new Set();
  const parts = (envPath || '').split(':').filter(Boolean);
  for (const dir of parts) {
    candidates.add(path.join(dir, command));
  }
  // Common Homebrew paths first
  candidates.add(`/opt/homebrew/bin/${command}`);
  candidates.add(`/usr/local/bin/${command}`);
  for (const candidate of candidates) {
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      return candidate;
    } catch {}
  }
  return null;
}

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
  const preferredManagers = Array.from(new Set([
    manager || 'yarn',
    'yarn',
    'npm',
    'pnpm'
  ]));

  const env = { ...process.env };
  env.PATH = ensureDarwinPath(env.PATH);

  let resolvedCommand = null;
  let resolvedManager = null;
  for (const m of preferredManagers) {
    const cmd = m === 'npm' ? 'npm' : m === 'pnpm' ? 'pnpm' : 'yarn';
    const absolute = resolveExecutable(cmd, env.PATH) || cmd;
    // If not in PATH, resolveExecutable returns null; still try the bare cmd on Windows/shell
    try {
      fs.accessSync(absolute, fs.constants.X_OK);
      resolvedCommand = absolute;
      resolvedManager = m;
      break;
    } catch {
      // If absolute is the same bare cmd, we cannot verify X_OK; try it only if on Windows/shell later
      if (absolute === cmd && process.platform === 'win32') {
        resolvedCommand = absolute;
        resolvedManager = m;
        break;
      }
    }
  }

  if (!resolvedCommand) {
    const msg = `No package manager executable found in PATH. Tried: ${preferredManagers.join(', ')}\nPATH: ${env.PATH}`;
    const error = new Error(msg);
    if (onLog) onLog('error', msg);
    throw error;
  }

  const args = resolvedManager === 'npm' ? ['run', 'dev'] : ['dev'];

  const child = spawn(resolvedCommand, args, {
    cwd: folderPath,
    shell: process.platform === 'win32', // make it work on Windows too
    env
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

  if (onLog) onLog('info', `Running: ${resolvedCommand} ${args.join(' ')}\nCWD: ${folderPath}`);
  child.stdout.on('data', onStdout);
  child.stderr.on('data', onStderr);
  child.on('error', (err) => {
    if (!resolved) urlReject(new Error(`Failed to start dev server: ${err.message}\nCommand: ${resolvedCommand} ${args.join(' ')}\nCWD: ${folderPath}\nPATH: ${env.PATH}`));
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
