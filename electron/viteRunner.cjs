
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

function splitCommandLine(cmd) {
  // Minimal shell-like splitter supporting quotes
  const out = [];
  let cur = '';
  let quote = null;
  for (let i = 0; i < cmd.length; i++) {
    const ch = cmd[i];
    if (quote) {
      if (ch === quote) {
        quote = null;
      } else if (ch === '\\' && i + 1 < cmd.length) {
        // simple escape support inside quotes
        i += 1; cur += cmd[i];
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"' || ch === '\'') {
        quote = ch;
      } else if (/\s/.test(ch)) {
        if (cur) { out.push(cur); cur = ''; }
      } else {
        cur += ch;
      }
    }
  }
  if (cur) out.push(cur);
  return out;
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

function readProjectPackageJson(folderPath) {
  try {
    const pkgPath = path.join(folderPath, 'package.json');
    if (!fs.existsSync(pkgPath)) return null;
    const raw = fs.readFileSync(pkgPath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function detectScriptKey(pkg) {
  if (!pkg || !pkg.scripts) return 'dev';
  if (pkg.scripts.dev) return 'dev';
  // Look for vite dev or serve
  const entries = Object.entries(pkg.scripts);
  const vite = entries.find(([k, v]) => /vite/.test(String(v)) && /(dev|serve)/.test(String(v)));
  if (vite) return vite[0];
  // Next.js dev
  const next = entries.find(([k, v]) => /next/.test(String(v)) && /dev/.test(String(v)));
  if (next) return next[0];
  // Fallback to start
  if (pkg.scripts.start) return 'start';
  return 'dev';
}

function ensureDevEnv(env) {
  const out = { ...env };
  out.NODE_ENV = 'development';
  out.YARN_PRODUCTION = 'false';
  out.npm_config_production = 'false';
  return out;
}

function runInstallIfNeeded(folderPath, manager, env, onLog) {
  return new Promise((resolve) => {
    try {
      const nodeModules = path.join(folderPath, 'node_modules');
      const hasNodeModules = fs.existsSync(nodeModules);
      // If missing node_modules or empty, install
      const needsInstall = !hasNodeModules || (hasNodeModules && fs.readdirSync(nodeModules).length === 0);
      if (!needsInstall) return resolve(true);
      const cmd = manager === 'npm' ? 'npm' : manager === 'pnpm' ? 'pnpm' : 'yarn';
      const args = manager === 'npm' ? ['install', '--include=dev'] : manager === 'pnpm' ? ['install', '--prod=false'] : ['install', '--production=false'];
      if (onLog) onLog('info', `Installing dependencies: ${cmd} ${args.join(' ')}`);
      const child = spawn(cmd, args, { cwd: folderPath, shell: process.platform === 'win32', env });
      child.stdout.on('data', (d) => onLog && onLog('stdout', d.toString()));
      child.stderr.on('data', (d) => onLog && onLog('stderr', d.toString()));
      child.on('exit', (code) => resolve(code === 0));
      child.on('error', () => resolve(false));
    } catch {
      resolve(false);
    }
  });
}

async function startVite(folderPath, manager='yarn', onLog) {
  const preferredManagers = Array.from(new Set([
    manager || 'yarn',
    'yarn',
    'npm',
    'pnpm'
  ]));

  let env = { ...process.env };
  env.PATH = ensureDarwinPath(env.PATH);
  // Prepend local node_modules/.bin so scripts can find local binaries regardless of manager quirks
  try {
    const localBin = path.join(folderPath, 'node_modules', '.bin');
    if (fs.existsSync(localBin)) {
      env.PATH = `${localBin}:${env.PATH}`;
    }
  } catch {}
  // Force dev-like environment so devDependencies are available
  env = ensureDevEnv(env);

  // Ensure dependencies present before running scripts
  await runInstallIfNeeded(folderPath, manager, env, onLog);

  // Resolve script key from package.json
  const pkg = readProjectPackageJson(folderPath);
  const scriptKey = detectScriptKey(pkg);
  if (onLog) onLog('info', `Detected script: ${scriptKey}`);

  // Determine how to execute: prefer direct local binary for reliability in production
  const rawScript = (pkg && pkg.scripts && pkg.scripts[scriptKey]) ? String(pkg.scripts[scriptKey]) : scriptKey;
  const preferVite = /(^|\s)vite(\s|$)/.test(rawScript);
  const parts = splitCommandLine(rawScript);
  let primary = parts[0] || 'vite';
  let restArgs = parts.slice(1);
  if (preferVite) {
    primary = 'vite';
    restArgs = [];
  }

  // Try local .bin first
  let execCmd = null;
  let execArgs = restArgs;
  try {
    const binName = process.platform === 'win32' ? `${primary}.cmd` : primary;
    const localBinPath = path.join(folderPath, 'node_modules', '.bin', binName);
    fs.accessSync(localBinPath, fs.constants.X_OK);
    execCmd = localBinPath;
  } catch {}

  // If no local bin, fallback to package manager run
  if (!execCmd) {
    let resolvedCommand = null;
    let resolvedManager = null;
    for (const m of preferredManagers) {
      const cmd = m === 'npm' ? 'npm' : m === 'pnpm' ? 'pnpm' : 'yarn';
      const absolute = resolveExecutable(cmd, env.PATH) || cmd;
      try {
        fs.accessSync(absolute, fs.constants.X_OK);
        resolvedCommand = absolute;
        resolvedManager = m;
        break;
      } catch {
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

    // Best-effort: ensure dependencies present
    try { runInstallIfNeeded(folderPath, resolvedManager, env, onLog).then(() => {}).catch(() => {}); } catch {}

    execCmd = resolvedCommand;
    execArgs = (resolvedManager === 'npm') ? ['run', scriptKey] : ['run', scriptKey];
  }

  // Run the chosen command
  const child = spawn(execCmd, execArgs, {
    cwd: folderPath,
    shell: process.platform === 'win32',
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

  if (onLog) onLog('info', `Running: ${execCmd} ${execArgs.join(' ')}\nCWD: ${folderPath}`);
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
