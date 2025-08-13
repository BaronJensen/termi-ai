
const { spawn } = require('child_process');
const os = require('os');
let pty = null;
try { pty = require('node-pty'); } catch {}
const fs = require('fs');
const path = require('path');

function extractJsonObjects(text) {
  // Enhanced JSON extraction that handles nested structures, arrays, and special characters
  const results = [];
  let i = 0;
  
  while (i < text.length) {
    // Find the start of a potential JSON object
    if (text[i] === '{') {
      let depth = 0;
      let inString = false;
      let escapeNext = false;
      let start = i;
      
      for (; i < text.length; i++) {
        const ch = text[i];
        
        if (escapeNext) {
          escapeNext = false;
          continue;
        }
        
        if (ch === '\\') {
          escapeNext = true;
          continue;
        }
        
        if (ch === '"' && !escapeNext) {
          inString = !inString;
          continue;
        }
        
        if (!inString) {
          if (ch === '{') {
            depth++;
          } else if (ch === '}') {
            depth--;
            if (depth === 0) {
              // We found a complete JSON object
              const jsonStr = text.slice(start, i + 1);
              try {
                // Validate it's actually valid JSON before adding
                JSON.parse(jsonStr);
                results.push(jsonStr);
              } catch (e) {
                // If it's not valid JSON, it might be a partial object
                // We'll skip it and continue looking
              }
              break;
            }
          } else if (ch === '[') {
            // Handle arrays within objects
            depth++;
          } else if (ch === ']') {
            depth--;
          }
        }
      }
    } else if (text[i] === '[') {
      // Handle standalone arrays
      let depth = 0;
      let inString = false;
      let escapeNext = false;
      let start = i;
      
      for (; i < text.length; i++) {
        const ch = text[i];
        
        if (escapeNext) {
          escapeNext = false;
          continue;
        }
        
        if (ch === '\\') {
          escapeNext = true;
          continue;
        }
        
        if (ch === '"' && !escapeNext) {
          inString = !inString;
          continue;
        }
        
        if (!inString) {
          if (ch === '[') {
            depth++;
          } else if (ch === ']') {
            depth--;
            if (depth === 0) {
              // We found a complete JSON array
              const jsonStr = text.slice(start, i + 1);
              try {
                // Validate it's actually valid JSON before adding
                JSON.parse(jsonStr);
                results.push(jsonStr);
              } catch (e) {
                // If it's not valid JSON, it might be a partial array
                // We'll skip it and continue looking
              }
              break;
            }
          } else if (ch === '{') {
            // Handle objects within arrays
            depth++;
          } else if (ch === '}') {
            depth--;
          }
        }
      }
    }
    
    i++;
  }
  
  return results;
}

function debugBufferContent(buffer, maxLength = 500) {
  // Helper function to debug buffer content
  if (!buffer || buffer.length === 0) {
    return 'Buffer is empty';
  }
  
  const truncated = buffer.length > maxLength 
    ? buffer.substring(0, maxLength) + '...' 
    : buffer;
  
  return `Buffer (${buffer.length} chars): "${truncated.replace(/\n/g, '\\n').replace(/\r/g, '\\r')}"`;
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

function startCursorAgent(message, sessionId, onLog, options = {}) {
  let timeoutId = null;
  let idleTimeoutId = null;
  let settled = false;
  let childRef = null;
  let lastActivity = Date.now();
  
  const wait = new Promise((resolve, reject) => {
    const STREAM_DEBUG = process.env.CURSOVABLE_STREAM_DEBUG === '1' || options.debugStream === true;
    let lastBufferWarnAt = 0;
    const args = ['-p', '--output-format="stream-json"'];
    // If using token auth, append -a <API_TOKEN>
    if (options.useTokenAuth && options.apiKey) {
      args.push('-a', String(options.apiKey));
    }
    // Model selection support
    if (options.model && typeof options.model === 'string') {
      args.push('--model', options.model);
    }
    
    // Add --resume sessionId if sessionId is provided
    if (sessionId) {
      args.push('--resume', sessionId);
    }
    
    args.push(`${message}. Avoid running build tools or scripts, we are already running the project`);
    
    // Safe display of args (mask API token if present)
    const displayArgs = args.map(a => (options && options.apiKey && a === String(options.apiKey)) ? '********' : a);
    if (onLog) onLog('info', `Running: cursor-agent ${displayArgs.map(a => (a.includes(' ') ? '"'+a+'"' : a)).join(' ')}`);
    if (onLog) onLog('info', `Working directory: ${options.cwd || process.cwd()}`);
    const env = { ...process.env };
    // If apiKey provided, pass as OPENAI_API_KEY to the child process only
    if (options.apiKey && typeof options.apiKey === 'string') {
      env.OPENAI_API_KEY = options.apiKey;
    }

    // Log a safe, non-sensitive confirmation that token auth is enabled
    if (options.useTokenAuth) {
      const token = typeof options.apiKey === 'string' ? options.apiKey : '';
      const tokenTail = token ? token.slice(-4) : '';
      if (onLog) onLog('info', `[auth] Using token auth (-a ********). OPENAI_API_KEY set (${token.length} chars), token ends with …${tokenTail}`);
    }
    env.PATH = ensureDarwinPath(env.PATH);
    const resolved = resolveCommandPath('cursor-agent', env.PATH) || 'cursor-agent';

    // Define buffer and handlers before wiring streams so references are valid
    let buffer = '';

    const stripAnsi = (s) => {
      try {
        return String(s || '')
          .replace(/\x1B\[[0-?]*[ -\/]*[@-~]/g, '')
          .replace(/\u001b\[[0-9;]*[A-Za-z]/g, '')
          .replace(/\x1b\[[0-9;]*[A-Za-z]/g, '')
          .replace(/\[[0-9;]*m/g, '')
          .replace(/\r(?!\n)/g, '\n')
          .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '');
      } catch { return String(s || ''); }
    };

    const handleData = (data) => {
      const str = stripAnsi(data.toString());
      // Update activity timestamp
      lastActivity = Date.now();
      
      // forward raw lines to UI for streaming feedback
      if (onLog) onLog('stream', str);
      buffer += str;
      
      // Prevent buffer from growing indefinitely (memory safety)
      if (buffer.length > 50000) {
        const now = Date.now();
        if (STREAM_DEBUG && onLog && now - lastBufferWarnAt > 5000) {
          onLog('warn', 'Buffer exceeded 50KB limit, truncating to last 25KB');
          lastBufferWarnAt = now;
        }
        buffer = buffer.slice(-25000);
      }
      
      // Log buffer size if it gets large (potential memory issue)
      if (buffer.length > 10000 && onLog) {
        const now = Date.now();
        if (now - lastBufferWarnAt > 5000) {
          if (STREAM_DEBUG) {
            onLog('warn', `Buffer is getting large: ${buffer.length} characters`);
            onLog('info', debugBufferContent(buffer, 200));
          }
          lastBufferWarnAt = now;
        }
      }
      
      // Try to parse any JSON objects found
      const objs = extractJsonObjects(buffer);
      if (objs.length > 0 && onLog && STREAM_DEBUG) {
        onLog('info', `Extracted ${objs.length} potential JSON objects from buffer`);
      }
      
      for (const raw of objs) {
        try {
          const obj = JSON.parse(raw);
          if (onLog) {
            try { onLog('json', JSON.stringify(obj)); } catch {}
          }
          if (onLog && STREAM_DEBUG) onLog('info', `Successfully parsed JSON: ${obj.type || 'unknown-type'}`);
          
          const normalized = normalizeSuccessObject(obj);
          if (normalized) {
            if (onLog && STREAM_DEBUG) onLog('info', 'Received success JSON from cursor-agent');
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
        } catch (parseError) {
          if (onLog && STREAM_DEBUG) onLog('error', `Failed to parse extracted JSON: ${parseError.message}`);
          if (onLog && STREAM_DEBUG) onLog('error', `Raw content: ${raw.substring(0, 200)}...`);
        }
      }
      
      // If we have a very large buffer and no JSON objects, log it for debugging
      if (buffer.length > 5000 && objs.length === 0 && onLog) {
        const now = Date.now();
        if (now - lastBufferWarnAt > 5000) {
          if (STREAM_DEBUG) {
            onLog('warn', 'Large buffer with no JSON objects detected');
            onLog('info', debugBufferContent(buffer, 300));
          }
          lastBufferWarnAt = now;
        }
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
        if (onLog) onLog('info', `Exit handler: Extracted ${objs.length} potential JSON objects from final buffer`);
        
        for (const raw of objs) {
          try {
            const obj = JSON.parse(raw);
            if (onLog) {
              try { onLog('json', JSON.stringify(obj)); } catch {}
            }
            if (onLog && STREAM_DEBUG) onLog('info', `Exit handler: Successfully parsed JSON: ${obj.type || 'unknown-type'}`);
            
            const normalized = normalizeSuccessObject(obj);
            if (normalized) {
              settled = true;
              clearTimeout(timeoutId);
              clearTimeout(idleTimeoutId);
              resolve(normalized);
              return;
            }
          } catch (parseError) {
            if (onLog) onLog('error', `Exit handler: Failed to parse extracted JSON: ${parseError.message}`);
            if (onLog) onLog('error', `Exit handler: Raw content: ${raw.substring(0, 200)}...`);
          }
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

async function runCursorAgent(message, sessionId, onLog, options = {}) {
  const { wait } = startCursorAgent(message, sessionId, onLog, options);
  return wait;
}

module.exports = { runCursorAgent, startCursorAgent };
