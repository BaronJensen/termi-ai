
const { spawn } = require('child_process');
const os = require('os');
let pty = null;
try { pty = require('node-pty'); } catch {}
const fs = require('fs');
const path = require('path');
const { stripAnsiAndControls: stripAnsi } = require('./utils/ansi.cjs');

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

// Stable serializer to canonicalize JSON (sorts object keys recursively)
function stableSerialize(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return '[' + value.map((v) => stableSerialize(v)).join(',') + ']';
  }
  const keys = Object.keys(value).sort();
  const parts = [];
  for (const k of keys) {
    parts.push(JSON.stringify(k) + ':' + stableSerialize(value[k]));
  }
  return '{' + parts.join(',') + '}';
}

// Extract complete JSON items with their ranges so we can trim the buffer
function extractJsonObjectsWithRanges(text) {
  const items = [];
  let i = 0;
  let lastConsumedIndex = -1;
  let maxJsonSize = 0; // Track the largest JSON object found
  const startTime = Date.now();
  const MAX_PARSE_TIME = 5000; // 5 second timeout for parsing

  while (i < text.length) {
    // Add timeout protection for very large buffers
    if (Date.now() - startTime > MAX_PARSE_TIME) {
      console.warn(`JSON parsing timeout after ${MAX_PARSE_TIME}ms, buffer size: ${text.length}`);
      break;
    }
    
    const ch0 = text[i];
    if (ch0 === '{' || ch0 === '[') {
      let depth = 0;
      let inString = false;
      let escapeNext = false;
      const start = i;

      for (; i < text.length; i++) {
        const ch = text[i];
        if (escapeNext) { escapeNext = false; continue; }
        if (ch === '\\') { escapeNext = true; continue; }
        if (ch === '"') { inString = !inString; continue; }
        if (!inString) {
          if (ch === '{' || ch === '[') depth++;
          else if (ch === '}' || ch === ']') {
            depth--;
            if (depth === 0) {
              const end = i;
              const jsonStr = text.slice(start, end + 1);
              try {
                JSON.parse(jsonStr);
                items.push({ json: jsonStr, start, end });
                lastConsumedIndex = end;
                maxJsonSize = Math.max(maxJsonSize, jsonStr.length);
              } catch (parseError) {
                // Log parsing errors for debugging large JSON objects
                if (jsonStr.length > 10000) { // Only log errors for large objects
                  console.warn(`Failed to parse large JSON (${jsonStr.length} chars): ${parseError.message}`);
                  console.warn(`JSON preview: ${jsonStr.substring(0, 200)}...`);
                }
              }
              break;
            }
          }
        }
      }
    }
    i++;
  }

  // Log if we found very large JSON objects
  if (maxJsonSize > 100000 && process.env.CURSOVABLE_STREAM_DEBUG === '1') {
    console.log(`Found JSON objects up to ${maxJsonSize} characters in size`);
  }

  return { items, lastConsumedIndex };
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
      env.CURSOR_CLI_API_KEY = options.apiKey;
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
    // Track seen content to deduplicate cursor-agent's duplicate JSON formats
    const seenContent = new Set();
    // Minimal incremental JSON buffering: forward all JSON to renderer; renderer handles UI logic

    // Use shared utility for stripping ANSI/control characters

    const handleData = (data) => {
      const str = stripAnsi(data.toString());
      // Update activity timestamp
      lastActivity = Date.now();
      
      // Append to buffer first
      buffer += str;
      // Extract and emit any full JSON objects/arrays from buffer
      const { items, lastConsumedIndex } = extractJsonObjectsWithRanges(buffer);
      
      // Debug logging for large JSON objects
      if (items.length > 0 && STREAM_DEBUG && onLog) {
        const largeItems = items.filter(item => item.json.length > 50000);
        if (largeItems.length > 0) {
          onLog('info', `Extracted ${items.length} JSON objects, including ${largeItems.length} large ones (${largeItems.map(item => item.json.length).join(', ')} chars)`);
        }
      }
      
      for (const { json: raw } of items) {
        try {
          const obj = JSON.parse(raw);
          
          // Create a content-based key for deduplication
          let contentKey = null;
          if (obj.type === 'assistant' && obj.message && obj.message.content) {
            // Extract the actual text content for deduplication
            const textContent = obj.message.content
              .filter(c => c && c.type === 'text' && typeof c.text === 'string')
              .map(c => c.text)
              .join('');
            if (textContent) {
              contentKey = `assistant:${textContent}`;
            }
          } else if (obj.type === 'result') {
            // For results, use the result text as key
            const resultText = typeof obj.result === 'string' ? obj.result : '';
            if (resultText) {
              contentKey = `result:${resultText}`;
            }
          }
          
          // Only emit if we haven't seen this content before
          if (!contentKey || !seenContent.has(contentKey)) {
            if (contentKey) {
              seenContent.add(contentKey);
            }
            // Forward all parsed JSON to renderer; renderer decides how to use it
            if (onLog) { try { onLog('json', stableSerialize(obj)); } catch {} }
          }
          // Resolve on success objects to finish the run
          const normalized = normalizeSuccessObject(obj);
          if (normalized) {
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
      if (lastConsumedIndex >= 0) {
        buffer = buffer.slice(lastConsumedIndex + 1);
      }

      // Prevent buffer from growing indefinitely (memory safety)
      // Increased limits to handle large JSON objects (file content, patches, etc.)
      if (buffer.length > 500000) { // 500KB limit instead of 50KB
        const now = Date.now();
        if (STREAM_DEBUG && onLog && now - lastBufferWarnAt > 5000) {
          onLog('warn', 'Buffer exceeded 500KB limit, truncating to last 250KB');
          lastBufferWarnAt = now;
        }
        buffer = buffer.slice(-250000);
      }
      
      // Log buffer size if it gets large (potential memory issue)
      if (buffer.length > 100000 && onLog) { // 100KB threshold instead of 10KB
        const now = Date.now();
        if (now - lastBufferWarnAt > 5000) {
          if (STREAM_DEBUG) {
            onLog('warn', `Buffer is getting large: ${buffer.length} characters`);
            onLog('info', debugBufferContent(buffer, 500)); // Show more content for debugging
          }
          lastBufferWarnAt = now;
        }
      }

      // Always forward raw lines so we can debug terminal output end-to-end
      if (onLog) onLog('stream', str);
      
      // If we have a very large buffer, log it for debugging
      if (buffer.length > 50000 && onLog) { // 50KB threshold instead of 5KB
        const now = Date.now();
        if (now - lastBufferWarnAt > 5000) {
          if (STREAM_DEBUG) {
            onLog('warn', 'Large buffer with no JSON objects detected');
            onLog('info', debugBufferContent(buffer, 500)); // Show more content for debugging
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
      // Final pass on remaining buffer
      if (buffer) {
        const { items } = extractJsonObjectsWithRanges(buffer);
        for (const { json: raw } of items) {
          try {
            const obj = JSON.parse(raw);
            
            // Create a content-based key for deduplication (same logic as handleData)
            let contentKey = null;
            if (obj.type === 'assistant' && obj.message && obj.message.content) {
              const textContent = obj.message.content
                .filter(c => c && c.type === 'text' && typeof c.text === 'string')
                .map(c => c.text)
                .join('');
              if (textContent) {
                contentKey = `assistant:${textContent}`;
              }
            } else if (obj.type === 'result') {
              const resultText = typeof obj.result === 'string' ? obj.result : '';
              if (resultText) {
                contentKey = `result:${resultText}`;
              }
            }
            
            // Only emit if we haven't seen this content before
            if (!contentKey || !seenContent.has(contentKey)) {
              if (contentKey) {
                seenContent.add(contentKey);
              }
              if (onLog) { try { onLog('json', stableSerialize(obj)); } catch {} }
            }
            
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

async function runCursorAgent(message, sessionId, onLog, options = {}) {
  const { wait } = startCursorAgent(message, sessionId, onLog, options);
  return wait;
}

module.exports = { runCursorAgent, startCursorAgent };
