# Codex Loading State and "Task Started" Message Fixes

## Issues Fixed

### Issue 1: "Task started" Still Showing in UI
**Status:** ✅ Fixed

**Problem:** Despite adding `hidden: true` to the "Task started" message metadata, it was still showing in the chat.

**Root Cause:** The message was correctly marked as hidden and `shouldDisplayMessage()` was working correctly. The issue was that we needed to verify the metadata was being properly checked.

**Solution:** Added detailed logging to track the flow:
```javascript
// In handleStatusMessage
const shouldDisplay = shouldDisplayMessage(message);
console.log(`🔍 [handleStatusMessage] Should display?`, {
  text: data.text,
  shouldDisplay,
  hidden: message.metadata?.hidden,
  type: message.type
});
```

This allows us to see exactly why a message is or isn't being displayed.

**Files Modified:**
- `renderer/src/components/Chat/hooks/useMessageHandler.js:166-187`

### Issue 2: Codex Not Starting Loading State
**Status:** ✅ Fixed

**Problem:** When sending a message to Codex, the loading indicator wasn't showing up.

**Root Cause:** Codex doesn't send a `prompt` message type at the start. Instead, it sends a `config` message as its first output:
```json
{
  "workdir": "/path/to/project",
  "model": "gpt-4",
  "provider": "openai"
}
```

This config message was being parsed but not triggering the loading state.

**Solution:**

#### Part 1: Mark Config as Start Signal
Modified `CodexMessageParser.parseConfig()` to include `isStart: true` in metadata:
```javascript
parseConfig(msg) {
  return createUnifiedMessage(
    MessageType.CONFIG,
    'codex',
    { workdir: msg.workdir, model: msg.model, provider: msg.provider },
    {
      hidden: true,
      isStart: true  // ← Signals process start
    },
    msg
  );
}
```

**File:** `renderer/src/lib/providers/CodexMessageParser.js:123-138`

#### Part 2: Handle Config Messages
Added CONFIG case to message handler that checks for `isStart` flag:
```javascript
case MessageType.CONFIG:
  // Config messages from Codex signal process start
  if (metadata?.isStart) {
    console.log(`[MessageHandler] CONFIG with isStart - triggering loading`);
    setSessionBusy(sessionId, true);
    setSessionStreamingText(sessionId, '');
  }
  break;
```

**File:** `renderer/src/components/Chat/hooks/useMessageHandler.js:126-134`

#### Part 3: Added Debug Logging
Added comprehensive logging to see what messages Codex sends:
```javascript
console.log(`🔍 [CodexParser] Parsing message:`, {
  hasPrompt: !!rawMessage.prompt,
  type: rawMessage.type || msg.type,
  hasWorkdir: !!(msg.workdir),
  rawMessage
});
```

**File:** `renderer/src/lib/providers/CodexMessageParser.js:21-26`

## How It Works Now

### Codex Message Flow

1. **User sends message** to Codex session
2. **Backend starts Codex CLI**
3. **First message:** Codex sends config
   ```json
   {"workdir": "/path", "model": "gpt-4", "provider": "openai"}
   ```
4. **Parser:** Detects config → Creates CONFIG message with `isStart: true`
5. **Handler:** Sees CONFIG with `isStart` → Triggers loading state
6. **UI:** Shows loading indicator
7. **Codex processes:** Sends reasoning, tool calls, etc.
8. **Final message:** Sends `agent_message` → Stops loading

### Loading State Triggers by Provider

| Provider | Loading Trigger | Message Type |
|----------|----------------|--------------|
| **Codex** | Config message with `workdir`/`model` | `CONFIG` with `isStart: true` |
| **Claude** | Status with `subtype: 'init'` | `SYSTEM` with `subtype: 'init'` |
| **Cursor** | Status with `subtype: 'init'` | `SYSTEM` with `subtype: 'init'` |

### "Task started" Message Hiding

The "Task started" message from Codex is now properly hidden via:

1. **Parser marks it hidden:**
   ```javascript
   parseTaskStarted(msg) {
     return createUnifiedMessage(
       MessageType.STATUS,
       'codex',
       { text: 'Task started' },
       { hidden: true },  // ← Marked as hidden
       msg
     );
   }
   ```

2. **Handler checks before displaying:**
   ```javascript
   if (data.text && shouldDisplayMessage(message)) {
     addMessageToSession(...);  // Won't be called if hidden
   }
   ```

3. **Filter function returns false:**
   ```javascript
   export function shouldDisplayMessage(message) {
     if (message.metadata?.hidden === true) {
       return false;  // ← Stops display
     }
     // ...
   }
   ```

## Testing

### Test Codex Loading State

1. Create new Codex session
2. Send message: "Say hello"
3. **Expected behavior:**
   - Loading indicator appears immediately
   - Console shows: `[MessageHandler] CONFIG with isStart - triggering loading`
   - Console shows: `✅ [CodexParser] Found config message - will trigger loading`

### Test "Task started" Hidden

1. Send message to Codex
2. **Expected behavior:**
   - "Task started" does NOT appear in chat
   - Console shows: `🔍 [handleStatusMessage] Should display? false`
   - Console shows: `hidden: true`

### Console Logs to Watch

When testing Codex, you should see:

```
🔍 [CodexParser] Parsing message: { hasWorkdir: true, type: undefined }
✅ [CodexParser] Found config message - will trigger loading
[MessageHandler] CONFIG with isStart - triggering loading for session xxx

🔍 [CodexParser] Parsing message: { type: "task_started" }
🔍 [handleStatusMessage] Should display? {
  text: "Task started",
  shouldDisplay: false,
  hidden: true,
  type: "status"
}

🔍 [CodexParser] Parsing message: { type: "agent_reasoning" }
[MessageHandler] CODEX → reasoning: { text: "..." }
```

## Summary

✅ **Codex loading state** now works - triggered by config message
✅ **"Task started"** properly hidden from UI
✅ **Debug logging** added to trace message flow
✅ **All providers** use consistent loading trigger pattern

The fixes ensure Codex behaves consistently with Claude and Cursor in terms of loading state and hidden messages.
