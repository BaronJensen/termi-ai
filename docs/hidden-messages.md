# Hidden Debug Messages

## Overview

Debug and system messages that don't provide value to users are now hidden from the chat UI. These messages are still processed internally for state management (like triggering loading states) but are not displayed.

## What Gets Hidden

### 1. **Session Lifecycle Messages**
- ❌ "Session started"
- ❌ "Session ended"
- ❌ Claude/Cursor/Codex initialization messages

**Why:** These are internal events that users don't need to see.

### 2. **Task Status Messages (Codex)**
- ❌ "Task started"

**Why:** This is a debugging message from Codex that just adds noise.

### 3. **Initialization Messages**
- ❌ "Claude Code initialized"
- ❌ "Cursor initialized" (with subtype='init')
- ❌ "Codex initialized" (with subtype='init')

**Why:** These trigger loading states but don't need to be displayed.

### 4. **Internal Metadata**
- ❌ Token counts
- ❌ Stream start/end markers
- ❌ File diffs
- ❌ File edit status

**Why:** These are technical details that clutter the conversation.

## What Still Shows

### ✅ **Assistant Responses**
All actual responses from Claude, Codex, or Cursor are shown with their provider badges.

### ✅ **User Messages**
All user input is displayed.

### ✅ **Errors**
Error messages are still displayed so users know when something went wrong.

### ✅ **Tool Results**
Meaningful tool execution results are shown (if they have output text).

### ✅ **Reasoning**
Agent reasoning/thinking is shown (for transparency).

## How It Works

### Two-Layer Filtering

#### Layer 1: Message Type Filter
Certain message types are always hidden:
```javascript
const hiddenTypes = [
  MessageType.CONFIG,
  MessageType.STREAMING_START,
  MessageType.STREAMING_END,
  MessageType.SESSION_START,   // ← Hidden
  MessageType.SESSION_END,     // ← Hidden
  MessageType.DIFF,
  MessageType.FILE_EDIT,
  MessageType.METADATA         // ← Hidden
];
```

#### Layer 2: Metadata Flag
Individual messages can be marked as hidden:
```javascript
{
  metadata: { hidden: true }
}
```

### Implementation

**File:** `renderer/src/lib/providers/messageFormat.js:176-201`
```javascript
export function shouldDisplayMessage(message) {
  // Check message type
  if (hiddenTypes.includes(message.type)) {
    return false;
  }

  // Check metadata flag
  if (message.metadata?.hidden === true) {
    return false;
  }

  // Check for empty text
  if (message.data?.text === '') {
    return false;
  }

  return true;
}
```

## Parser Updates

### Claude (`ClaudeMessageParser.js`)
- `parseSystem()` - Hides messages with `subtype: 'init'`
- `parseSessionStart()` - Always hidden
- `parseSessionEnd()` - Always hidden

### Codex (`CodexMessageParser.js`)
- `parseTaskStarted()` - Always hidden

### Cursor (`CursorMessageParser.js`)
- `parseStatus()` - Hides messages with `subtype: 'init'`
- `parseSessionStart()` - Always hidden
- `parseSessionEnd()` - Always hidden

## Benefits

1. **Cleaner Chat:** Users only see meaningful messages
2. **Better UX:** Less clutter = easier to follow conversation
3. **Still Functional:** Loading states and internal tracking still work
4. **Debugging Still Works:** Console logs still show all messages

## Testing

To verify messages are hidden:

1. Create a new session with any provider
2. Send a message
3. Check that you don't see:
   - "Session started"
   - "Task started"
   - "[Provider] initialized"
4. Check that you DO see:
   - Your user message
   - Assistant response with provider badge
   - Any errors (if they occur)

## Console Logs

Hidden messages still appear in console logs for debugging:
```
🎯 [handleParsedMessage] PARSED: { type: "session_start", ... }
[MessageHandler] Message type session_start is hidden
```

This allows developers to debug while keeping the UI clean for users.
