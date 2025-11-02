# Debugging Provider Badge Issues

## How to Debug

I've added comprehensive logging throughout the provider message flow. Here's what to look for in the console when you send a message with Codex or Claude.

## Expected Log Flow for Codex

When you send a message to a Codex session, you should see these logs in order:

### 1. Session Creation/Selection
```
✨ Creating new session with provider: codex
💾 Session xxx created and saved with provider: codex
```

### 2. Message Sending
```
🤖 Running agent with provider: codex
  sessionProvider: "codex"
  settingsProvider: "codex"
  finalProvider: "codex"
```

### 3. Log Reception from Backend
```
🔍 createMessageHandler: Using provider "codex" for session xxx
  payloadProvider: "codex"       ← KEY: This should be "codex"
  sessionProvider: "codex"
  fallback: "cursor"
  messageType: "agent_message"
  finalProvider: "codex"         ← KEY: This should be "codex"
```

### 4. Message Parsing
```
🎯 [handleParsedMessage] ENTRY:
  provider: "codex"               ← KEY: Input provider
  messageType: "agent_message"
  sessionId: "session-xxx"

🎯 [handleParsedMessage] PARSED:
  inputProvider: "codex"
  unifiedProvider: "codex"       ← KEY: Parser output provider
  messageType: "assistant"
  match: true                     ← KEY: Should be true
```

### 5. Message Handling
```
🎯 [handleAssistantMessage] Creating message with provider: codex
🎯 [handleAssistantMessage] Final message - Adding to session:
  provider: "codex"               ← KEY: Should be "codex"
  messageId: "msg-xxx"
```

### 6. Message Storage
```
📝 addMessageToSession called:
  sessionId: "session-xxx"
  messageType: "assistant"
  provider: "codex"               ← KEY: Should be "codex"
  isToolCall: false
  messageId: "msg-xxx"

🎯 [addMessageToSession] Full message object:
  {
    provider: "codex",            ← KEY: Should be "codex"
    who: "assistant",
    text: "...",
    ...
  }

🎯 [addMessageToSession] Message added. Last message provider: codex
🎯 [addMessageToSession] Session saved with N messages. Latest provider: codex
```

### 7. Message Rendering
```
🎯 [Bubble] Rendering assistant message with provider: codex
```

## Diagnostic Checklist

If the badge is showing wrong, check these key points in order:

### ✅ Step 1: Backend Sending Correct Provider
Look for: `🔍 createMessageHandler: Using provider`
- **Check:** Is `payloadProvider` correct?
- **If NO:** Backend is not sending the right provider
- **If YES:** Continue to Step 2

### ✅ Step 2: Parser Selection
Look for: `🎯 [handleParsedMessage] ENTRY`
- **Check:** Is `provider` parameter correct?
- **If NO:** Provider lost between backend and parser
- **If YES:** Continue to Step 3

### ✅ Step 3: Parser Output
Look for: `🎯 [handleParsedMessage] PARSED`
- **Check:** Is `unifiedProvider` correct?
- **Check:** Is `match` true?
- **If NO:** Wrong parser was used
- **If YES:** Continue to Step 4

### ✅ Step 4: Message Creation
Look for: `🎯 [handleAssistantMessage] Final message - Adding to session`
- **Check:** Is `provider` correct?
- **If NO:** Provider lost in message handler
- **If YES:** Continue to Step 5

### ✅ Step 5: Message Storage
Look for: `🎯 [addMessageToSession] Full message object`
- **Check:** Does message object have correct `provider` field?
- **If NO:** Provider lost before storage
- **If YES:** Continue to Step 6

### ✅ Step 6: Message Rendering
Look for: `🎯 [Bubble] Rendering assistant message with provider`
- **Check:** Is provider correct?
- **If NO:** Provider lost between storage and render
- **If YES:** Check browser DevTools if badge CSS is wrong

## Common Issues

### Issue 1: `payloadProvider: undefined`
**Symptom:** Backend not sending provider
**Fix:** Check `electron/main.cjs:1180` - ensure provider is in logPayload

### Issue 2: `unifiedProvider` doesn't match `inputProvider`
**Symptom:** Wrong parser selected
**Fix:** Check `ParserRegistry.getParser()` - ensure correct parser returned

### Issue 3: `provider` is undefined in `addMessageToSession`
**Symptom:** Handler not passing provider to message
**Fix:** Check all `addMessageToSession()` calls include `provider: message.provider`

### Issue 4: Provider correct in logs but wrong in UI
**Symptom:** React state not updating
**Fix:** Check if sessions state is being updated correctly after `setSessions()`

## Test Commands

Open DevTools Console and run:

```javascript
// Check current session
const currentSession = /* get from UI state */;
console.log('Current session:', currentSession);
console.log('Session provider:', currentSession?.provider);

// Check last message
const lastMessage = currentSession?.messages?.[currentSession.messages.length - 1];
console.log('Last message:', lastMessage);
console.log('Last message provider:', lastMessage?.provider);
```

## Expected Output by Provider

| Provider | Badge Color | Badge Text | Icon |
|----------|-------------|------------|------|
| Codex    | Green (#10b981) | CODEX | 🔥 |
| Claude   | Purple (#8b5cf6) | CLAUDE | 🤖 |
| Cursor   | Blue (#3b82f6) | CURSOR | ⚡ |

## Clean Test Procedure

1. **Clear localStorage:**
   ```javascript
   localStorage.clear();
   ```

2. **Refresh page**

3. **Create new Codex session:**
   - Click "+ New Session"
   - Select "Codex"

4. **Send a test message:**
   - Type: "Say hello"
   - Send

5. **Watch console logs** following the flow above

6. **Verify badge** shows green "CODEX"

If any step shows wrong provider, that's where the bug is!
