
const { spawn } = require('child_process');
const os = require('os');
let pty = null;
try { pty = require('node-pty'); } catch {}
const fs = require('fs');
const path = require('path');

function extractJsonObjects(text) {
  // Attempt to extract JSON objects from a stream
  const results = [];
  let depth = 0;
  let start = -1;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && start !== -1) {
        const slice = text.slice(start, i + 1);
        results.push(slice);
        start = -1;
      }
    }
  }
  return results;
}

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

function normalizeSuccessObject(obj) {
  // Normalize various success shapes into our canonical contract
  const isSuccessLike = (
    obj && (
      obj.subtype === 'success' || obj.type === 'result' || obj.success === true ||
      obj.event === 'result' || obj.status === 'success'
    ) && obj.is_error !== true
  );
  if (!isSuccessLike) return null;
  const text = typeof obj.result === 'string'
    ? obj.result
    : (typeof obj.output === 'string' ? obj.output : (obj.message || ''));
  return {
    type: 'result',
    subtype: 'success',
    is_error: false,
    result: text,
    raw: obj,
  };
}

function startCursorAgent(message, apiKey, onLog, options = {}) {
  let timeoutId = null;
  let idleTimeoutId = null;
  let settled = false;
  let childRef = null;
  let lastActivity = Date.now();
  
  const wait = new Promise((resolve, reject) => {
    const args = ['-p',  '--output-format="stream-json"',  `${message}. Avoid running build tools or scripts, we are already running the project.`];
    if (onLog) onLog('info', `Running: cursor-agent ${args.map(a => (a.includes(' ') ? '"'+a+'"' : a)).join(' ')}`);
    if (onLog) onLog('info', `Working directory: ${options.cwd || process.cwd()}`);
    const env = { ...process.env, ...(apiKey ? { OPENAI_API_KEY: apiKey } : {}) };
    env.PATH = ensureDarwinPath(env.PATH);
    const resolved = resolveCommandPath('cursor-agent', env.PATH) || 'cursor-agent';

    // Define buffer and handlers before wiring streams so references are valid
    let buffer = '';

    const handleData = (data) => {
      const str = data.toString();
      // Update activity timestamp
      lastActivity = Date.now();
      
      // forward raw lines to UI for streaming feedback
      if (onLog) onLog('stream', str);
      buffer += str;
      
      // Try to parse any JSON objects found
      const objs = extractJsonObjects(buffer);
      for (const raw of objs) {
        try {
          const obj = JSON.parse(raw);
          const normalized = normalizeSuccessObject(obj);
          if (normalized) {
            if (onLog) onLog('info', 'Received success JSON from cursor-agent');
            settled = true;
            clearTimeout(timeoutId);
            clearTimeout(idleTimeoutId);
            try { 
              if (childRef && typeof childRef.kill === 'function') {
                childRef.kill('SIGTERM');
              } else if (childRef && childRef.pid) {
                process.kill(childRef.pid, 'SIGTERM');
              }
            } catch {}
            resolve(normalized);
          }
        } catch {}
      }
    };

    const cleanup = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      clearTimeout(idleTimeoutId);
      try { 
        if (childRef && typeof childRef.kill === 'function') {
          childRef.kill('SIGTERM');
        } else if (childRef && childRef.pid) {
          process.kill(childRef.pid, 'SIGTERM');
        }
      } catch {}
    };

    const childExitHandler = (code) => {
      if (onLog) onLog('info', `cursor-agent exited with code ${code}`);
      // If not already resolved, try one last parse
      if (buffer && !settled) {
        const objs = extractJsonObjects(buffer);
        for (const raw of objs) {
          try {
            const obj = JSON.parse(raw);
            const normalized = normalizeSuccessObject(obj);
            if (normalized) {
              settled = true;
              clearTimeout(timeoutId);
              clearTimeout(idleTimeoutId);
              resolve(normalized);
              return;
            }
          } catch {}
        }
      }
      // As a fallback, reject with raw output
      if (code !== 0 && !settled) {
        settled = true;
        clearTimeout(timeoutId);
        clearTimeout(idleTimeoutId);
        reject(new Error(`cursor-agent exited with code ${code}. Output:\n${buffer}`));
      } else if (!settled) {
        // could have been success without our pattern
        settled = true;
        clearTimeout(timeoutId);
        clearTimeout(idleTimeoutId);
        resolve({ type: 'raw', output: buffer });
      }
    };

    // Try PTY first, fallback to spawn if it fails
    let ptyFailed = false;
    if (pty && !ptyFailed) {
      try {
        const shell = process.platform === 'win32' ? 'powershell.exe' : (process.env.SHELL || '/bin/zsh');
        const cmdLine = `${resolved} ${args.map(a => (a.includes(' ') ? '"'+a+'"' : a)).join(' ')}`;
        if (onLog) onLog('info', `Using PTY with shell: ${shell}`);
        
        const p = pty.spawn(shell, [], {
          name: 'xterm-color',
          cwd: options.cwd || process.cwd(),
          env
        });
        childRef = p;
        p.onData((data) => handleData(Buffer.from(data)));
        p.onExit(({ exitCode }) => {
          // emulate exit handler
          childExitHandler(exitCode);
        });
        // Write command into the PTY so the environment and login shell are used
        p.write(cmdLine + '\r');
        
        if (onLog) onLog('info', 'PTY terminal created successfully');
      } catch (err) {
        if (onLog) onLog('warn', `PTY failed, falling back to spawn: ${err.message}`);
        ptyFailed = true;
        // Fall through to spawn below
      }
    }
    
    // Fallback to spawn if PTY failed or not available
    if (!pty || ptyFailed) {
      if (onLog) onLog('info', 'Using spawn fallback for terminal');
      
      const child = spawn(resolved, args, {
        shell: process.platform === 'win32', // support Windows
        env,
        cwd: options.cwd || process.cwd()
      });
      childRef = child;
      child.stdout.on('data', handleData);
      child.stderr.on('data', handleData);
      child.on('error', (err) => {
        if (onLog) onLog('error', err.message);
        cleanup();
        reject(new Error(`Failed to start cursor-agent: ${err.message}`));
      });
      child.on('exit', (code) => childExitHandler(code));
    }

    // Idle timeout - kill process if no output for extended period
    const idleTimeoutMs = 300000; // 5 minutes - increased for long-running commands
    idleTimeoutId = setInterval(() => {
      if (settled) return;
      const timeSinceActivity = Date.now() - lastActivity;
      if (timeSinceActivity > idleTimeoutMs) {
        if (onLog) onLog('error', `cursor-agent idle timeout after ${idleTimeoutMs}ms of no output`);
        cleanup();
        resolve({ type: 'raw', output: buffer, idle_timeout: true });
      }
    }, 10000); // Check every 10 seconds - less frequent checking

    // Overall timeout support
    const timeoutMs = typeof options.timeoutMs === 'number' ? options.timeoutMs : 900000; // 15 min default - increased for long-running commands
    if (timeoutMs > 0) {
      timeoutId = setTimeout(() => {
        if (settled) return;
        if (onLog) onLog('error', `cursor-agent timeout after ${timeoutMs}ms`);
        cleanup();
        resolve({ type: 'raw', output: buffer, timeout: true });
      }, timeoutMs);
    }
  });
  
  return { child: childRef, wait };
}

async function runCursorAgent(message, apiKey, onLog, options = {}) {
  const { wait } = startCursorAgent(message, apiKey, onLog, options);
  return wait;
}

module.exports = { runCursorAgent, startCursorAgent };
