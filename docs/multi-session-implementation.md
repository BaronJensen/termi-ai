# Multi-Session Implementation

## Overview

This document describes the implementation of multi-session support in Termi AI, allowing multiple chat sessions to run concurrently with unique terminals for better debugging and workflow management.

## Key Features

### 🚀 **Concurrent Sessions**

- Multiple chat sessions can run simultaneously
- Each session has its own isolated terminal
- Sessions are completely independent of each other

### 🏷️ **Session Identification**

- Unique terminal names: `cursor-session-{sessionId}-{timestamp}`
- Session labels in all log messages: `[Session abc12345]`
- Easy identification in process monitoring

### 📱 **Session Management**

- Track active processes per session
- Session lifecycle management
- Ability to kill all processes for a specific session

## Implementation Details

### 1. Runner Changes (`electron/runner.cjs`)

#### Session Labeling

```javascript
// Generate unique terminal name for this session
const terminalName = `cursor-session-${sessionId || "default"}-${Date.now()}`;
const sessionLabel = sessionId ? `Session ${sessionId.slice(0, 8)}` : "Default";
```

#### Enhanced Logging

All log messages now include session context:

- `[Session abc12345] Using PTY with shell: /bin/zsh`
- `[Session abc12345] Buffer exceeded 500KB limit, truncating to last 250KB`
- `[Session abc12345] cursor-agent exited with code 0`

#### Unique Terminal Names

```javascript
const p = pty.spawn(shell, [], {
  name: terminalName, // Unique name per session
  cwd: options.cwd || process.cwd(),
  env,
});
```

### 2. Main Process Changes (`electron/main.cjs`)

#### Session Process Tracking

```javascript
const sessionProcs = new Map(); // sessionId -> Set of runIds
```

#### Session Management Functions

- `addSessionProcess(sessionId, runId)` - Track new process
- `removeSessionProcess(sessionId, runId)` - Remove completed process
- `getSessionInfo()` - Get current session status
- `killSessionProcesses(sessionId)` - Kill all processes for a session

#### Enhanced Process Monitoring

Process names now include session context:

- `cursor-agent:Session abc12345:def67890` instead of just `cursor-agent:def67890`

### 3. IPC Handlers

#### New Endpoints

- `get-session-info` - Returns information about all active sessions
- `kill-session-processes` - Kills all processes for a specific session

#### Session Info Response

```javascript
{
  "session-1": {
    "activeProcesses": 2,
    "runIds": ["run1", "run2"],
    "processes": [
      {
        "runId": "run1",
        "pid": 12345,
        "status": "active"
      }
    ]
  }
}
```

## Usage Examples

### Starting Multiple Sessions

```javascript
// Session 1
const session1 = await window.cursovable.runCursor({
  message: "Hello from session 1",
  sessionId: "session-1",
  cwd: "/path/to/project1",
});

// Session 2 (concurrent)
const session2 = await window.cursovable.runCursor({
  message: "Hello from session 2",
  sessionId: "session-2",
  cwd: "/path/to/project2",
});
```

### Getting Session Information

```javascript
const sessionInfo = await window.cursovable.getSessionInfo();
console.log("Active sessions:", sessionInfo);
```

### Killing Session Processes

```javascript
const result = await window.cursovable.killSessionProcesses("session-1");
console.log(`Killed ${result.killed}/${result.total} processes`);
```

## Benefits

### 🔍 **Better Debugging**

- Clear session identification in all logs
- Unique terminal names for process monitoring
- Session-specific buffer management

### 📊 **Process Management**

- Track which processes belong to which sessions
- Kill entire sessions when needed
- Monitor session resource usage

### 🚀 **Workflow Efficiency**

- Work on multiple projects simultaneously
- Keep sessions isolated and organized
- No interference between different chat contexts

## Technical Considerations

### Memory Management

- Each session has its own buffer (500KB limit)
- Large JSON objects are handled per-session
- No shared state between sessions

### Process Isolation

- Each session gets its own PTY/spawn process
- Independent timeout and idle timeout handling
- Separate cleanup and error handling

### Performance

- Minimal overhead for session tracking
- Efficient process lookup and management
- Session-specific performance monitoring

## Future Enhancements

### Potential Improvements

1. **Session Groups** - Group related sessions together
2. **Resource Limits** - Per-session memory/CPU limits
3. **Session Persistence** - Save/restore session state
4. **Cross-Session Communication** - Allow sessions to share data
5. **Session Templates** - Pre-configured session configurations

### Monitoring Features

1. **Session Analytics** - Track session performance over time
2. **Resource Usage** - Monitor per-session resource consumption
3. **Session History** - Log of all session activities
4. **Health Checks** - Automatic session health monitoring

## Testing

### Test Script

Use `test-multi-sessions.js` to verify functionality:

```bash
node test-multi-sessions.js
```

### Expected Behavior

- Each session starts with unique terminal name
- All sessions run concurrently
- Session labels appear in all log messages
- No interference between sessions
- Proper cleanup when sessions complete

## Troubleshooting

### Common Issues

#### Session Not Starting

- Check if `sessionId` is provided
- Verify terminal creation permissions
- Check for conflicting process names

#### Session Labeling Issues

- Ensure `sessionId` is not undefined
- Check log message formatting
- Verify session context is passed correctly

#### Process Tracking Problems

- Check `sessionProcs` Map initialization
- Verify process cleanup on completion
- Monitor for memory leaks in session tracking

### Debug Mode

Enable debug logging:

```bash
export CURSOVABLE_STREAM_DEBUG=1
```

This will show detailed session information and process management logs.
