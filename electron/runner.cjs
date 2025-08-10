
const { spawn } = require('child_process');
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
  let settled = false;
  let childRef = null;
  const wait = new Promise((resolve, reject) => {
    const args = ['-p', '--output-format=json', message];
    if (onLog) onLog('info', `Running: cursor-agent ${args.map(a => (a.includes(' ') ? '"'+a+'"' : a)).join(' ')}`);
    const env = { ...process.env, ...(apiKey ? { OPENAI_API_KEY: apiKey } : {}) };
    env.PATH = ensureDarwinPath(env.PATH);
    const resolved = resolveCommandPath('cursor-agent', env.PATH) || 'cursor-agent';
    const child = spawn(resolved, args, {
      shell: process.platform === 'win32', // support Windows
      env
    });
    childRef = child;

    let buffer = '';

    const handleData = (data) => {
      const str = data.toString();
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
            try { child.kill(); } catch {}
            resolve(normalized);
          }
        } catch {}
      }
    };

    child.stdout.on('data', handleData);
    child.stderr.on('data', handleData);

    child.on('error', (err) => {
      if (onLog) onLog('error', err.message);
      settled = true;
      clearTimeout(timeoutId);
      reject(new Error(`Failed to start cursor-agent: ${err.message}`));
    });
    child.on('exit', (code) => {
      if (onLog) onLog('info', `cursor-agent exited with code ${code}`);
      // If not already resolved, try one last parse
      if (buffer) {
        const objs = extractJsonObjects(buffer);
        for (const raw of objs) {
          try {
            const obj = JSON.parse(raw);
            const normalized = normalizeSuccessObject(obj);
            if (normalized) {
              settled = true;
              clearTimeout(timeoutId);
              resolve(normalized);
              return;
            }
          } catch {}
        }
      }
      // As a fallback, reject with raw output
      if (code !== 0) {
        settled = true;
        clearTimeout(timeoutId);
        reject(new Error(`cursor-agent exited with code ${code}. Output:\n${buffer}`));
      } else {
        // could have been success without our pattern
        settled = true;
        clearTimeout(timeoutId);
        resolve({ type: 'raw', output: buffer });
      }
    });

    // Timeout support
    const timeoutMs = typeof options.timeoutMs === 'number' ? options.timeoutMs : 180000; // 3 min default
    if (timeoutMs > 0) {
      timeoutId = setTimeout(() => {
        if (settled) return;
        if (onLog) onLog('error', `cursor-agent timeout after ${timeoutMs}ms`);
        try { child.kill(); } catch {}
        settled = true;
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
