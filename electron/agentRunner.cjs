/**
 * agentRunner.cjs
 *
 * Universal runner for all AI agent providers
 * Handles process spawning, I/O, and lifecycle management for any provider
 */

const { spawn } = require('child_process');
const os = require('os');
let pty = null;
try { pty = require('node-pty'); } catch {}

const { stripAnsiAndControls: stripAnsi } = require('./utils/ansi.cjs');
const { registry } = require('./providers/index.cjs');

/**
 * Start an AI agent process using the specified provider
 *
 * @param {string} providerName - Name of the provider to use ('cursor', 'claude', 'codex')
 * @param {Object} options - Configuration options
 * @param {string} options.message - User message to send
 * @param {string} options.cwd - Working directory
 * @param {string} [options.sessionId] - Session ID for resumption
 * @param {string} [options.model] - Model to use
 * @param {string} [options.apiKey] - API key if required
 * @param {Object} [options.sessionObject] - Session metadata
 * @param {boolean} [options.usePty=true] - Whether to use PTY
 * @param {Function} onLog - Callback for log messages: (level, line, metadata) => void
 * @returns {Promise<Object>} Process reference with kill method
 */
async function startAgent(providerName, options, onLog) {
  console.log(`🚀 Starting agent with provider: ${providerName}`);

  // Get the provider
  const provider = registry.getProvider(providerName);
  if (!provider) {
    throw new Error(`Provider '${providerName}' not found. Available: ${registry.getAllProviders().map(p => p.getName()).join(', ')}`);
  }

  // Validate options
  const validation = provider.validateOptions(options);
  if (!validation.valid) {
    throw new Error(`Invalid options for ${providerName}: ${validation.error}`);
  }

  // Check if provider is available
  const availability = await provider.checkAvailability();
  if (!availability.available) {
    throw new Error(`Provider '${providerName}' is not available: ${availability.error}`);
  }

  // Mark provider as active
  registry.markActive(providerName);

  try {
    // Resolve CLI path
    const cliPath = await provider.resolveCliPath();
    console.log(`📍 Using CLI: ${cliPath}`);

    // Build arguments
    const { args, env, useStdin, stdinData } = await provider.buildArgs(options);
    console.log(`⚙️  Args:`, args);

    // Spawn the process
    const process = await spawnAgentProcess(
      cliPath,
      args,
      {
        cwd: options.cwd,
        env,
        usePty: options.usePty !== false && pty !== null,
        sessionObject: options.sessionObject
      },
      (level, line, metadata) => {
        onLog(level, line, {
          ...metadata,
          provider: providerName,
          providerDisplayName: provider.getDisplayName()
        });
      },
      provider
    );

    // Write message to stdin if needed
    if (useStdin && stdinData) {
      console.log(`📝 Writing message to stdin (${stdinData.length} chars)`);
      if (process.ptyProcess) {
        process.ptyProcess.write(stdinData + '\n');
      } else if (process.childProcess && process.childProcess.stdin) {
        process.childProcess.stdin.write(stdinData + '\n');
        process.childProcess.stdin.end();
      }
    }

    return process;
  } catch (error) {
    registry.markInactive(providerName);
    throw error;
  }
}

/**
 * Spawn the agent process (PTY or regular spawn)
 */
async function spawnAgentProcess(cliPath, args, spawnOptions, onLog, provider) {
  const { cwd, env, usePty, sessionObject } = spawnOptions;

  // Parsing context
  const parseContext = {
    buffer: ''
  };

  // Process reference
  let childProcess = null;
  let ptyProcess = null;
  let killed = false;

  // Data handler
  const handleData = (data) => {
    if (killed) return;

    // Strip ANSI codes
    const cleaned = stripAnsi(data);

    // Parse using provider
    const messages = provider.parseOutput(cleaned, parseContext);

    // Send parsed messages
    for (const msg of messages) {
      if (msg.type === 'json') {
        onLog('json', JSON.stringify(msg.data), {
          ...sessionObject,
          messageType: msg.data.type
        });

        // Extract and notify session ID if present
        const sessionId = provider.extractSessionId(msg.data);
        if (sessionId && sessionId !== sessionObject?.cursorSessionId) {
          onLog('info', `Session ID: ${sessionId}`, {
            ...sessionObject,
            cursorSessionId: sessionId
          });
        }
      } else if (msg.type === 'text') {
        onLog('stream', msg.data.text, sessionObject);
      }
    }
  };

  // Exit handler
  const handleExit = (code, signal) => {
    if (killed) return;
    killed = true;

    const exitInfo = provider.handleExit(code, signal);
    const level = code === 0 ? 'info' : 'error';
    const message = code === 0
      ? `Agent exited successfully`
      : `Agent exited with code ${code}${signal ? ` (signal: ${signal})` : ''}`;

    onLog(level, message, {
      ...sessionObject,
      exitCode: code,
      exitSignal: signal,
      error: exitInfo.error
    });

    // Mark provider as inactive
    registry.markInactive(provider.getName());
  };

  // Spawn with PTY or regular spawn
  if (usePty && pty) {
    console.log(`🔧 Spawning with PTY`);

    const shell = process.platform === 'win32' ? 'cmd.exe' : (process.env.SHELL || '/bin/bash');
    const sessionId = sessionObject?.id || 'unknown';
    const terminalName = `${provider.getName()}-session-${sessionId}-${Date.now()}`;

    ptyProcess = pty.spawn(shell, [], {
      name: terminalName,
      cols: 120,
      rows: 30,
      cwd,
      env
    });

    // Build command line
    const cmdLine = [cliPath, ...args.map(escapeShellArg)].join(' ');
    console.log(`📤 PTY command: ${cmdLine}`);

    ptyProcess.write(cmdLine + '\r');

    ptyProcess.onData(handleData);
    ptyProcess.onExit(({ exitCode, signal }) => handleExit(exitCode, signal));

    return {
      ptyProcess,
      kill: (signal = 'SIGTERM') => {
        if (!killed) {
          killed = true;
          ptyProcess.kill(signal);
        }
      },
      write: (data) => {
        if (!killed) {
          ptyProcess.write(data);
        }
      }
    };
  } else {
    console.log(`🔧 Spawning with child_process`);

    childProcess = spawn(cliPath, args, {
      cwd,
      env,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    childProcess.stdout.on('data', (data) => handleData(data.toString()));
    childProcess.stderr.on('data', (data) => handleData(data.toString()));
    childProcess.on('exit', (code, signal) => handleExit(code, signal));

    childProcess.on('error', (error) => {
      onLog('error', `Process error: ${error.message}`, {
        ...sessionObject,
        error: error.message
      });
      registry.markInactive(provider.getName());
    });

    return {
      childProcess,
      kill: (signal = 'SIGTERM') => {
        if (!killed && childProcess) {
          killed = true;
          childProcess.kill(signal);
        }
      },
      write: (data) => {
        if (!killed && childProcess && childProcess.stdin) {
          childProcess.stdin.write(data);
        }
      }
    };
  }
}

/**
 * Escape shell arguments
 */
function escapeShellArg(arg) {
  if (typeof arg !== 'string') {
    return String(arg);
  }

  if (process.platform === 'win32') {
    return '"' + arg.replace(/"/g, '""') + '"';
  }

  if (arg.includes("'")) {
    return "'" + arg.replace(/'/g, "'\"'\"'") + "'";
  }

  return "'" + arg + "'";
}

/**
 * Get all available providers
 */
async function getAvailableProviders() {
  return await registry.getAvailableProviders();
}

/**
 * Get provider metadata
 */
function getProviderMetadata(providerName) {
  const provider = registry.getProvider(providerName);
  return provider ? provider.getMetadata() : null;
}

module.exports = {
  startAgent,
  getAvailableProviders,
  getProviderMetadata,
  registry
};
