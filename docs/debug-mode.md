# Debug Mode for Cursovable

The debug mode allows you to test the Cursovable application without calling the real `cursor-agent` CLI. Instead, it uses a mock data generator that simulates realistic responses.

## Features

- **Safe Testing**: Test the UI and logic without making real API calls
- **Realistic Mock Data**: Generates JSON responses that match the real cursor-agent format
- **Configurable Timing**: Adjust delays to simulate different response speeds
- **Multiple Activation Methods**: Enable via environment variables, code options, or IPC calls

## Activation Methods

### 1. Environment Variables

Set one of these environment variables to enable debug mode globally:

```bash
# Method 1: Explicit debug mode flag
export CURSOVABLE_DEBUG_MODE=1

# Method 2: Development environment (auto-enables debug mode)
export NODE_ENV=development
```

### 2. Code Options

Pass `debugMode: true` when calling `startCursorAgent`:

```javascript
const { startCursorAgent } = require("./electron/runner.cjs");

const { child, wait } = startCursorAgent(message, sessionId, onLog, {
  debugMode: true,
  mockTypingDelay: 100, // ms between characters
  mockMessageDelay: 2000, // ms between messages
  mockFinalDelay: 1000, // ms before final result
});
```

### 3. IPC Handler

Use the IPC handler to toggle debug mode at runtime:

```javascript
// Enable debug mode
await window.electronAPI.invoke("debug-mode-set", {
  enabled: true,
  options: {
    mockTypingDelay: 100,
    mockMessageDelay: 2000,
    mockFinalDelay: 1000,
  },
});

// Check debug mode status
const { debugMode } = await window.electronAPI.invoke("debug-mode-get");

// Disable debug mode
await window.electronAPI.invoke("debug-mode-set", { enabled: false });
```

### 4. Per-Request Debug Mode

Enable debug mode for a specific request by passing `debugMode: true` in the cursor-run IPC call:

```javascript
await window.electronAPI.invoke("cursor-run", {
  message: "Help me with this code",
  debugMode: true, // This request will use mock data
});
```

## Mock Data Structure

The mock generator produces realistic JSON responses that match the cursor-agent format, with full session support:

### Session Start

```json
{
  "type": "session_start",
  "session_id": "test-session-123",
  "message": "Starting new session: test-session-123",
  "timestamp": "2025-08-19T19:37:00.006Z",
  "metadata": {
    "user_message": "Help me create a React component",
    "session_type": "mock_debug",
    "version": "1.0.0",
    "created_at": "2025-08-19T19:37:00.006Z",
    "mock_options": {
      "typingDelay": 100,
      "messageDelay": 2000,
      "finalDelay": 1000
    }
  }
}
```

### Assistant Messages

```json
{
  "type": "assistant",
  "message": {
    "content": [
      {
        "type": "text",
        "text": "I understand you want me to help with: \"your message here\""
      }
    ],
    "role": "assistant",
    "session_id": "test-session-123",
    "timestamp": "2025-08-19T19:37:00.006Z"
  },
  "session_id": "test-session-123"
}
```

### Tool Calls

```json
{
  "type": "tool_call",
  "tool_calls": [
    {
      "id": "call_123",
      "type": "function",
      "function": {
        "name": "file_search",
        "arguments": "{\"query\": \"package.json\"}"
      }
    }
  ],
  "session_id": "test-session-123"
}
```

### Tool Results

```json
{
  "type": "tool_result",
  "tool_use_id": "call_123",
  "content": [
    {
      "type": "text",
      "text": "Found package.json in the current directory."
    }
  ],
  "session_id": "test-session-123"
}
```

### Final Results

```json
{
  "type": "result",
  "subtype": "success",
  "is_error": false,
  "result": "Mock execution completed successfully for: \"your message\"",
  "raw": {
    "type": "result",
    "success": true,
    "message": "Mock execution completed"
  },
  "session_id": "test-session-123"
}
```

## Session Management

The mock data generator provides complete session lifecycle support:

- **Session Start**: Initial message with metadata and configuration
- **Session ID**: All messages include the session_id for proper tracking
- **Timestamps**: Each message includes ISO timestamp for timing analysis
- **Session End**: Final message with session statistics and duration

## Configuration Options

### Timing Controls

- **`mockTypingDelay`**: Milliseconds between character emissions (default: 100ms)
- **`mockMessageDelay`**: Milliseconds between message types (default: 2000ms)
- **`mockFinalDelay`**: Milliseconds before final result (default: 1000ms)

### Example Configuration

```javascript
const mockOptions = {
  mockTypingDelay: 50, // Very fast typing
  mockMessageDelay: 1000, // Quick messages
  mockFinalDelay: 500, // Fast completion
};

await window.electronAPI.invoke("debug-mode-set", {
  enabled: true,
  options: mockOptions,
});
```

## Testing

### Run the Test Script

```bash
node test-debug-mode.js
```

This script demonstrates:

- Basic mock data generation
- Custom timing options
- Environment variable control
- Runner integration simulation

### Manual Testing

1. Start the Electron app
2. Enable debug mode via IPC or environment variable
3. Send a message through the UI
4. Watch the mock responses in the logs

## Logging

When debug mode is enabled, you'll see clear indicators in the logs:

```
🧪 DEBUG MODE ENABLED: Using mock data generator instead of cursor-agent CLI
   Mock typing delay: 100ms
   Mock message delay: 2000ms
   Mock final delay: 1000ms
```

And in session logs:

```
[Session abc12345] 🧪 DEBUG MODE: Using mock data generator instead of cursor-agent CLI
[Session abc12345] Mock message: "Help me with this code"
```

## Use Cases

- **Development**: Test UI changes without API calls
- **Testing**: Verify error handling and edge cases
- **Demo**: Show the app functionality without real dependencies
- **Debugging**: Isolate issues between UI logic and API responses
- **CI/CD**: Run tests in environments without cursor-agent access

## Disabling Debug Mode

To return to normal operation:

```bash
# Unset environment variables
unset CURSOVABLE_DEBUG_MODE
unset NODE_ENV

# Or via IPC
await window.electronAPI.invoke('debug-mode-set', { enabled: false });
```

## Troubleshooting

### Mock Data Not Appearing

1. Check that debug mode is enabled
2. Verify the mock generator is running
3. Check console logs for debug mode indicators

### Timing Issues

1. Adjust the timing options if responses are too fast/slow
2. Check for conflicts with other timers in the app

### Integration Problems

1. Ensure the mock generator is properly imported
2. Check that the runner is calling the mock function
3. Verify IPC handlers are properly registered

## Architecture

The debug mode is implemented with minimal changes to the existing codebase:

1. **MockDataGenerator**: Generates realistic mock responses
2. **Runner Integration**: Detects debug mode and routes to mock generator
3. **IPC Handlers**: Allow runtime control of debug mode
4. **Environment Variables**: Provide global control
5. **Backward Compatibility**: Normal operation when debug mode is disabled

This design ensures that debug mode can be easily enabled/disabled without affecting the production code path.
