
const { spawn } = require('child_process');
const os = require('os');
let pty = null;
try { pty = require('node-pty'); } catch {}
const fs = require('fs');
const path = require('path');

// Properly escape shell arguments to handle quotes, newlines, and other special characters
function escapeShellArg(arg) {
  if (typeof arg !== 'string') {
    return String(arg);
  }
  
  // On Windows, use different escaping
  if (process.platform === 'win32') {
    // Windows cmd/PowerShell escaping - wrap in double quotes and escape internal quotes
    return '"' + arg.replace(/"/g, '""') + '"';
  }
  
  // Unix shell escaping - wrap in single quotes and handle internal single quotes
  if (arg.includes("'")) {
    // If the string contains single quotes, we need to close the quote, escape the single quote, and reopen
    return "'" + arg.replace(/'/g, "'\"'\"'") + "'";
  }
  
  // Simple case - just wrap in single quotes
  return "'" + arg + "'";
}
const { stripAnsiAndControls: stripAnsi } = require('./utils/ansi.cjs');
const { MockDataGenerator } = require('./mockDataGenerator.cjs');

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

function isDebugModeEnabled(options = {}) {
  return options.debugMode === true || 
         process.env.CURSOVABLE_DEBUG_MODE === '1' || 
         process.env.NODE_ENV === 'development' && options.forceDebug !== false;
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

function startMockCursorAgent(message, sessionObject, onLog, options = {}) {
  // Extract session information
  const sessionId = sessionObject?.cursorSessionId || null;
  const internalSessionId = sessionObject?.id || null;
  
  const sessionLabel = internalSessionId ? `Session ${internalSessionId.slice(0, 8)}` : 'Default';
  
  if (onLog) onLog('info', `[${sessionLabel}] 🧪 DEBUG MODE: Using mock data generator instead of cursor-agent CLI`);
  if (onLog) onLog('info', `[${sessionLabel}] Mock message: "${message}"`);
  if (onLog) onLog('info', `[${sessionLabel}] Internal Session ID: ${internalSessionId || 'none'}`);
  if (onLog) onLog('info', `[${sessionLabel}] Cursor Session ID: ${sessionId || 'none'}`);
  
  const mockGenerator = new MockDataGenerator(message, sessionObject, {
    typingDelay: options.mockTypingDelay || 100,
    messageDelay: options.mockMessageDelay || 2000,
    finalDelay: options.mockFinalDelay || 1000
  });
  
  const wait = new Promise((resolve) => {
    let settled = false;
    
    const cleanup = () => {
      if (settled) return;
      settled = true;
      mockGenerator.stop();
    };
    
    mockGenerator.on('data', (data) => {
      if (settled) return;
      
      try {
        // Parse the mock data to validate it's proper JSON
        const obj = JSON.parse(data);
        
        // Forward the mock data to the renderer
        if (onLog) {
          try { onLog('json', JSON.stringify(obj)); } catch {}
          onLog('stream', data);
        }
        
        // Check if this is a success result
        const normalized = normalizeSuccessObject(obj);
        if (normalized) {
          settled = true;
          cleanup();
          resolve(normalized);
        }
      } catch (parseError) {
        // If it's not valid JSON, treat as raw stream data
        if (onLog) onLog('stream', data);
      }
    });
    
    mockGenerator.on('exit', (code) => {
      if (settled) return;
      if (onLog) onLog('info', `[${sessionLabel}] Mock generator exited with code ${code}`);
      
      // If we haven't resolved yet, provide a fallback result
      if (!settled) {
        settled = true;
        cleanup();
        resolve({
          type: 'result',
          subtype: 'success',
          is_error: false,
          result: `Mock execution completed for: "${message}"`,
          raw: { type: 'mock_result', success: true }
        });
      }
    });
    
    // Start the mock generator
    mockGenerator.start();
    
    // Set a timeout for the mock execution
    setTimeout(() => {
      if (settled) return;
      if (onLog) onLog('warn', `[${sessionLabel}] Mock execution timeout`);
      cleanup();
      resolve({
        type: 'result',
        subtype: 'success',
        is_error: false,
        result: `Mock execution completed (timeout) for: "${message}"`,
        raw: { type: 'mock_result', success: true, timeout: true }
      });
    }, 10000); // 10 second timeout for mock execution
  });
  
  return { child: mockGenerator, wait };
}

function startCursorAgent(message, sessionObject, onLog, options = {}) {
  // Check if debug mode is enabled
  if (isDebugModeEnabled(options)) {
    return startMockCursorAgent(message, sessionObject, onLog, options);
  }
  
  // Check permissions before starting cursor-agent
  if (options.cwd) {
    try {
      const fs = require('fs');
      fs.accessSync(options.cwd, fs.constants.R_OK | fs.constants.W_OK);
      
      // Test file creation/deletion
      const testFile = require('path').join(options.cwd, '.cursor-agent-startup-test');
      fs.writeFileSync(testFile, 'test', 'utf8');
      fs.unlinkSync(testFile);
    } catch (permErr) {
      if (onLog) onLog('error', `[${sessionObject?.id ? `Session ${sessionObject.id.slice(0, 8)}` : 'Default'}] Permission check failed: ${permErr.message}`);
      return {
        child: null,
        wait: Promise.resolve({ 
          type: 'error', 
          error: `Permission denied: cursor-agent cannot read/write in working directory: ${options.cwd}. Please check folder permissions.`,
          permission_error: true
        })
      };
    }
  }
  
  let timeoutId = null;
  let idleTimeoutId = null;
  let settled = false;
  let childRef = null;
  let lastActivity = Date.now();
  
  // Extract session information
  const sessionId = sessionObject?.cursorSessionId || null;
  const internalSessionId = sessionObject?.id || null;
  
  // Generate unique terminal name for this session
  const terminalName = `cursor-session-${internalSessionId || 'default'}-${Date.now()}`;
  const sessionLabel = internalSessionId ? `Session ${internalSessionId.slice(0, 8)}` : 'Default';
  
  const wait = new Promise((resolve, reject) => {
    const STREAM_DEBUG = process.env.CURSOVABLE_STREAM_DEBUG === '1' || options.debugStream === true;
    let lastBufferWarnAt = 0;
    const args = ['-p', '--output-format=stream-json', '--force'];
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
      if (onLog) onLog('info', `[${sessionLabel}] Resuming existing session: ${sessionId}`);
    } else {
      if (onLog) onLog('info', `[${sessionLabel}] Starting new session (no existing session ID)`);
    }
    
    // Handle long messages by using stdin instead of command line args
    const fullMessage = `${message}. Avoid running build tools or scripts, we are already running the project`;
    const MESSAGE_LENGTH_LIMIT = 8000; // Safe command line length limit
    const useStdin = fullMessage.length > MESSAGE_LENGTH_LIMIT;
    
    if (useStdin) {
      if (onLog) onLog('info', `[${sessionLabel}] Message too long (${fullMessage.length} chars), using stdin`);
      // Don't add message to args, will be passed via stdin
    } else {
      args.push(fullMessage);
    }
    
    // Safe display of args (mask API token if present)
    const displayArgs = args.map(a => (options && options.apiKey && a === String(options.apiKey)) ? '********' : a);
    if (onLog) onLog('info', `[${sessionLabel}] Running: cursor-agent ${displayArgs.map(a => escapeShellArg(a)).join(' ')}`);
    if (onLog) onLog('info', `[${sessionLabel}] Working directory: ${options.cwd || process.cwd()}`);
    
    // Log the session information being used for this run
    if (onLog) onLog('info', `[${sessionLabel}] Internal Session ID: ${internalSessionId || 'none'}`);
    if (onLog) onLog('info', `[${sessionLabel}] Cursor Session ID: ${sessionId || 'none'}`);
    
    const env = { ...process.env };
    // If apiKey provided, pass as OPENAI_API_KEY to the child process only
    if (options.apiKey && typeof options.apiKey === 'string') {
      env.CURSOR_CLI_API_KEY = options.apiKey;
    }

    // Log a safe, non-sensitive confirmation that token auth is enabled
    if (options.useTokenAuth) {
      const token = typeof options.apiKey === 'string' ? options.apiKey : '';
      const tokenTail = token ? token.slice(-4) : '';
      if (onLog) onLog('info', `[${sessionLabel}] [auth] Using token auth (-a ********). OPENAI_API_KEY set (${token.length} chars), token ends with …${tokenTail}`);
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
      
      // Debug: Log first data received to detect if cursor-agent is responding
      if (buffer === '' && str.length > 0) {
        if (onLog) onLog('info', `[${sessionLabel}] First data received (${str.length} chars): ${str.slice(0, 100)}${str.length > 100 ? '...' : ''}`);
      }
      
      // Append to buffer first
      buffer += str;
      // Extract and emit any full JSON objects/arrays from buffer
      const { items, lastConsumedIndex } = extractJsonObjectsWithRanges(buffer);
      
      // Debug logging for large JSON objects
      if (items.length > 0 && STREAM_DEBUG && onLog) {
        const largeItems = items.filter(item => item.json.length > 50000);
        if (largeItems.length > 0) {
          onLog('info', `[${sessionLabel}] Extracted ${items.length} JSON objects, including ${largeItems.length} large ones (${largeItems.map(item => item.json.length).join(', ')} chars)`);
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
            clearTimeout(quickTimeoutId);
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
          onLog('warn', `[${sessionLabel}] Buffer exceeded 500KB limit, truncating to last 250KB`);
          lastBufferWarnAt = now;
        }
        buffer = buffer.slice(-250000);
      }
      
      // Log buffer size if it gets large (potential memory issue)
      if (buffer.length > 100000 && onLog) { // 100KB threshold instead of 10KB
        const now = Date.now();
        if (now - lastBufferWarnAt > 5000) {
          if (STREAM_DEBUG) {
            onLog('warn', `[${sessionLabel}] Buffer is getting large: ${buffer.length} characters`);
            onLog('info', `[${sessionLabel}] ${debugBufferContent(buffer, 500)}`); // Show more content for debugging
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
            onLog('warn', `[${sessionLabel}] Large buffer with no JSON objects detected`);
            onLog('info', `[${sessionLabel}] ${debugBufferContent(buffer, 500)}`); // Show more content for debugging
          }
          lastBufferWarnAt = now;
        }
      }
    };

    const cleanup = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      try { 
        if (childRef && typeof childRef.kill === 'function') {
          childRef.kill('SIGTERM');
        } else if (childRef && childRef.pid) {
          process.kill(childRef.pid, 'SIGTERM');
        }
      } catch {}
      if (onLog) onLog('info', `[${sessionLabel}] Cleanup completed`);
    };

    const childExitHandler = (code) => {
      if (onLog) onLog('info', `[${sessionLabel}] cursor-agent exited with code ${code}`);
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
              clearTimeout(quickTimeoutId);
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
        clearTimeout(quickTimeoutId);
        reject(new Error(`[${sessionLabel}] cursor-agent exited with code ${code}. Output:\n${buffer}`));
      } else if (!settled) {
        // could have been success without our pattern
        settled = true;
        clearTimeout(timeoutId);
        clearTimeout(idleTimeoutId);
        clearTimeout(quickTimeoutId);
        resolve({ type: 'raw', output: buffer });
      }
    };

    // Try PTY first, fallback to spawn if it fails
    let ptyFailed = false;
    if (pty && !ptyFailed) {
      try {
        const shell = process.platform === 'win32' ? 'powershell.exe' : (process.env.SHELL || '/bin/zsh');
        const cmdLine = `${escapeShellArg(resolved)} ${args.map(a => escapeShellArg(a)).join(' ')}`;
        if (onLog) onLog('info', `[${sessionLabel}] Using PTY with shell: ${shell}`);
        
        const p = pty.spawn(shell, [], {
          name: terminalName,
          cwd: options.cwd || process.cwd(),
          env
        });
        childRef = p;
        p.onData((data) => handleData(Buffer.from(data)));
        p.onExit(({ exitCode }) => {
          // emulate exit handler
          if (onLog) onLog('info', `[${sessionLabel}] PTY terminal exited with code ${exitCode}`);
          childExitHandler(exitCode);
        });
        // Write command into the PTY so the environment and login shell are used
        // Add a small delay to ensure shell is ready, then write the command
        setTimeout(() => {
          if (onLog) onLog('info', `[${sessionLabel}] Writing command to PTY: ${cmdLine}`);
          p.write(cmdLine + '\r');
        }, 50);
        
        // If using stdin for long message, write it after the command
        if (useStdin) {
          setTimeout(() => {
            p.write(fullMessage + '\n');
            // Send EOF to indicate end of stdin input
            p.write('\x04'); // Ctrl+D (EOF)
          }, 100); // Small delay to ensure command is processed first
        }
        
        if (onLog) onLog('info', `[${sessionLabel}] PTY terminal created successfully`);
      } catch (err) {
        if (onLog) onLog('warn', `[${sessionLabel}] PTY failed, falling back to spawn: ${err.message}`);
        ptyFailed = true;
        // Fall through to spawn below
      }
    }
    
    // Fallback to spawn if PTY failed or not available
    if (!pty || ptyFailed) {
      if (onLog) onLog('info', `[${sessionLabel}] Using spawn fallback for terminal`);
      
      const child = spawn(resolved, args, {
        shell: process.platform === 'win32', // support Windows
        env,
        cwd: options.cwd || process.cwd()
      });
      childRef = child;
      child.stdout.on('data', handleData);
      child.stderr.on('data', handleData);
      child.on('error', (err) => {
        if (onLog) onLog('error', `[${sessionLabel}] ${err.message}`);
        cleanup();
        reject(new Error(`[${sessionLabel}] Failed to start cursor-agent: ${err.message}`));
      });
      child.on('exit', (code) => childExitHandler(code));
      
      // If using stdin for long message, write it to the process
      if (useStdin) {
        setTimeout(() => {
          child.stdin.write(fullMessage + '\n');
          child.stdin.end(); // Close stdin to signal end of input
        }, 100); // Small delay to ensure process is ready
      }
    }


    // Overall timeout support (only use if explicitly set in options)
    const timeoutMs = typeof options.timeoutMs === 'number' ? options.timeoutMs : 0; // Default: no timeout (infinite)
    if (timeoutMs > 0) {
      timeoutId = setTimeout(() => {
        if (settled) return;
        if (onLog) onLog('error', `[${sessionLabel}] cursor-agent timeout after ${timeoutMs}ms`);
        cleanup();
        resolve({ type: 'raw', output: buffer, timeout: true });
      }, timeoutMs);
    }
  });
  
  return { child: childRef, wait };
}

async function runCursorAgent(message, sessionObject, onLog, options = {}) {
  const { wait } = startCursorAgent(message, sessionObject, onLog, options);
  return wait;
}

// Global debug mode state
let globalDebugMode = false;

function setDebugMode(enabled, options = {}) {
  globalDebugMode = enabled;
  if (enabled) {
    console.log('🧪 DEBUG MODE ENABLED: Using mock data generator instead of cursor-agent CLI');
    if (options.mockTypingDelay) console.log(`   Mock typing delay: ${options.mockTypingDelay}ms`);
    if (options.mockMessageDelay) console.log(`   Mock message delay: ${options.mockMessageDelay}ms`);
    if (options.mockFinalDelay) console.log(`   Mock final delay: ${options.mockFinalDelay}ms`);
  } else {
    console.log('✅ DEBUG MODE DISABLED: Using real cursor-agent CLI');
  }
}

function getDebugMode() {
  return globalDebugMode;
}

module.exports = { 
  runCursorAgent, 
  startCursorAgent, 
  setDebugMode, 
  getDebugMode,
  isDebugModeEnabled,
  MockDataGenerator 
};
