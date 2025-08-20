# Chat Hooks Documentation

This directory contains React hooks that manage the chat functionality, session management, and terminal communication for the Cursovable application.

## Hook Architecture

The hooks are designed with a clear separation of concerns and follow a layered architecture:

```
SessionProvider (Context Provider)
├── useSessionManager (Core session logic)
    ├── useMessageHandler (Message processing)
    └── useTerminalStatus (Terminal communication)
└── useChatSend (Chat input handling)
```

## Core Hooks

### `useSessionManager`

The main hook that orchestrates all session-related functionality.

**Responsibilities:**
- Session state management (create, load, delete, switch)
- Message storage and retrieval
- Tool call state management
- Terminal log management
- Cursor command execution

**Key Functions:**
- `createNewSession()` - Create a new chat session
- `loadSession(sessionId)` - Switch to an existing session
- `deleteSession(sessionId)` - Remove a session
- `send(text, sessionObj)` - Send a message to cursor-agent
- `updateSessionWithCursorId(sessionId, cursorSessionId)` - Link internal session to cursor session

**State:**
- `sessions` - Array of all sessions
- `currentSessionId` - Currently active session
- `busyBySession` - Map of session busy states
- `toolCallsBySession` - Map of tool calls per session
- `terminalLogs` - Map of terminal logs per session

### `useMessageHandler`

Specialized hook for processing different types of messages from cursor sessions.

**Responsibilities:**
- Parse and handle JSON log messages
- Create appropriate message objects for different types
- Route messages to the correct session

**Supported Message Types:**
- `session_start` - Session initialization
- `assistant` - AI assistant responses
- `result` - Command execution results
- `tool_call` - Tool usage
- `tool_result` - Tool execution results
- `session_end` - Session completion
- `stream` - Streaming content
- `patch` - File changes
- `file_operation` - File operations
- `command` - Command execution
- `thinking` - AI thinking process
- `error` - Error messages

**Key Functions:**
- `handleParsedMessage(parsed, sessionId)` - Main message processor
- Individual handlers for each message type

### `useTerminalStatus`

Manages terminal communication and cursor session mapping.

**Responsibilities:**
- Set up centralized log router
- Route logs to appropriate session handlers
- Provide terminal status information
- Manage cursor session ID mapping

**Key Functions:**
- `setupLogRouter()` - Initialize the log routing system
- `handleCursorLog(payload)` - Process incoming cursor logs
- `getSessionTerminalStatus(sessionId)` - Get terminal status for a session
- `getCursorSessionId(sessionId)` - Map internal to cursor session ID
- `cleanupLogRouter()` - Clean up router resources

**State:**
- `logRouter` - Reference to the active log router
- Session status mapping functions

### `useChatSend`

Handles chat input and message sending.

**Responsibilities:**
- Manage chat input state
- Handle message submission
- Integrate with session manager for sending

## Usage Examples

### Basic Session Management

```jsx
import { useSession } from '../providers/SessionProvider';

function ChatComponent() {
  const { 
    sessions, 
    currentSessionId, 
    createNewSession, 
    send 
  } = useSession();

  const handleNewSession = () => {
    createNewSession();
  };

  const handleSend = (text) => {
    const currentSession = sessions.find(s => s.id === currentSessionId);
    send(text, currentSession);
  };

  return (
    <div>
      <button onClick={handleNewSession}>New Session</button>
      {/* Chat UI */}
    </div>
  );
}
```

### Terminal Status Monitoring

```jsx
import { useSession } from '../providers/SessionProvider';

function TerminalStatus() {
  const { 
    getCurrentTerminalSession,
    getAllSessionsTerminalStatus 
  } = useSession();

  const currentTerminal = getCurrentTerminalSession();
  const allStatuses = getAllSessionsTerminalStatus();

  return (
    <div>
      <h3>Current Terminal: {currentTerminal?.name}</h3>
      <div>
        {allStatuses.map(status => (
          <div key={status.id}>
            {status.name} - {status.runningTerminal ? 'Running' : 'Idle'}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Message Processing

```jsx
import { useMessageHandler } from './hooks/useMessageHandler';

function MessageProcessor({ addMessageToSession, updateSessionWithCursorId }) {
  const messageHandler = useMessageHandler(addMessageToSession, updateSessionWithCursorId);

  const processMessage = (parsedMessage, sessionId) => {
    messageHandler.handleParsedMessage(parsedMessage, sessionId);
  };

  return (
    <div>
      {/* Message processing UI */}
    </div>
  );
}
```

## State Flow

1. **User Input** → `useChatSend` → `useSessionManager.send()`
2. **Cursor Execution** → `useTerminalStatus.setupLogRouter()` → Log routing
3. **Message Processing** → `useMessageHandler.handleParsedMessage()` → Session updates
4. **State Updates** → React re-renders with new session/message state

## Benefits of This Architecture

1. **Separation of Concerns** - Each hook has a specific responsibility
2. **Reusability** - Hooks can be used independently in different components
3. **Testability** - Individual hooks can be tested in isolation
4. **Maintainability** - Clear structure makes debugging and updates easier
5. **Performance** - Optimized with useCallback and proper dependency management
6. **Type Safety** - Clear interfaces between hooks

## Error Handling

All hooks include comprehensive error handling:
- Try-catch blocks around critical operations
- Console logging for debugging
- Graceful fallbacks for missing data
- Error messages added to sessions when operations fail

## Performance Considerations

- Uses `useCallback` for function memoization
- Minimizes unnecessary re-renders
- Efficient state updates with Map-based structures
- Proper cleanup of event listeners and resources
