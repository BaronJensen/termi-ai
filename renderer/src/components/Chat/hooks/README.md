# Chat Hooks - Modular Architecture

This directory contains the refactored chat functionality split into reusable, modular functions. The original monolithic `useChatSend` hook has been broken down into smaller, focused modules.

## File Structure

### Core Hook

- **`useChatSend.js`** - Main hook that orchestrates the chat functionality

### Utility Modules

- **`chatUtils.js`** - General utility functions for chat operations
- **`messageHandlers.js`** - Functions for processing different types of log messages
- **`sessionManagement.js`** - Functions for managing chat sessions and state
- **`errorHandling.js`** - Error handling and fallback logic
- **`index.js`** - Barrel export file for easy importing

## Key Functions

### Chat Utilities (`chatUtils.js`)

- `normalizePath(path)` - Normalize file paths for comparison
- `stripAnsiAndControls(input)` - Remove ANSI escape codes from terminal output
- `extractJsonCandidate(line)` - Extract JSON from mixed text
- `appendWithOverlap(base, chunk, lastChunk)` - Append text with deduplication
- `generateRunId()` - Generate unique run identifiers
- `verifyAndSwitchWorkingDirectory(desiredCwd)` - Security check for working directory
- `resetTextareaHeight()` - Reset input textarea to default height
- `createCursorAgentTimeout(timeoutMs, runId, onTimeout)` - Create timeout handlers
- `normalizeToolCallData(parsed)` - Normalize tool call data from various formats
- `formatErrorMessage(errorMessage)` - Format error messages for better UX

### Message Handlers (`messageHandlers.js`)

- `handleJsonLogLine(parsed, context)` - Process JSON log lines from cursor-agent
- `handleStreamLogLine(line, context)` - Process stream log lines (fallback)
- `handleEndMarker(context)` - Handle end markers for legacy runners
- `createLogStreamHandler(context)` - Create the main log stream subscription handler

### Session Management (`sessionManagement.js`)

- `addUserMessage(context)` - Add user message and update session name
- `createStreamingMessage(context)` - Create streaming assistant message
- `updateSessionWithCursorId(context)` - Link sessions with cursor-agent
- `getSessionIdForCursor(context)` - Get appropriate session ID for cursor-agent
- `markAllToolCallsCompleted(context)` - Mark all tool calls as complete
- `createFinalResultMessage(context)` - Create final result message
- `cleanupStreamingState(context)` - Clean up streaming state

### Error Handling (`errorHandling.js`)

- `handleError(context)` - Handle and display errors
- `handleFallbackCompletion(context)` - Handle fallback completion scenarios
- `handleClientTimeout(context)` - Handle client-side timeouts
- `validateInput(context)` - Validate user input before processing
- `logCursorDebugInfo(context)` - Log debug information for cursor-agent

## Usage Examples

### Basic Import

```javascript
import { useChatSend, normalizePath, handleError } from "./hooks";
```

### Using Utility Functions

```javascript
import { verifyAndSwitchWorkingDirectory, generateRunId } from "./hooks";

// Check and switch working directory
const isVerified = await verifyAndSwitchWorkingDirectory("/path/to/project");

// Generate unique run ID
const runId = generateRunId();
```

### Using Message Handlers

```javascript
import { createLogStreamHandler } from "./hooks";

const logHandler = createLogStreamHandler({
  runId: "abc123",
  currentSessionId: "session1",
  // ... other context
});

// Subscribe to logs
const unsubscribe = window.cursovable.onCursorLog(logHandler);
```

### Using Session Management

```javascript
import { addUserMessage, createStreamingMessage } from "./hooks";

// Add user message
addUserMessage({
  text: "Hello world",
  currentSessionId: "session1",
  // ... other context
});

// Create streaming message
const streamIndex = createStreamingMessage({
  setMessages,
  streamIndexRef,
});
```

## Benefits of This Architecture

1. **Reusability** - Functions can be imported and used in other components
2. **Testability** - Each function can be unit tested independently
3. **Maintainability** - Easier to understand and modify specific functionality
4. **Separation of Concerns** - Each module has a clear, focused responsibility
5. **Code Organization** - Related functionality is grouped together logically

## Migration Notes

The original `useChatSend` hook functionality remains exactly the same from the consumer's perspective. All the refactoring is internal, so existing code will continue to work without changes.

To use the new modular functions in other components, simply import them from the hooks directory:

```javascript
import {
  normalizePath,
  handleError,
  createLogStreamHandler,
} from "../Chat/hooks";
```
