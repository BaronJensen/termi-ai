# Provider Badge Fix V2 - Provider Priority Issue

## Issue
After implementing session migration, Claude and Codex responses were still showing the Cursor badge instead of their correct provider badges.

## Root Cause Analysis

### The Flow
1. **Session Creation:** Session is created with `provider: 'codex'` ✅
2. **Backend Call:** `send()` calls `runAgent({ provider: 'codex' })` ✅
3. **Backend Processing:** Backend runs Codex agent ✅
4. **Log Emission:** Backend sends logs with `{ provider: 'codex', ... }` ✅
5. **Frontend Reception:** `createMessageHandler` receives payload ✅
6. **Provider Resolution:** **❌ PROBLEM HERE**

### The Problem

In `createMessageHandler` (line 1124), provider was resolved as:

```javascript
const provider = session?.provider || payload.provider || 'cursor';
```

**Issue:** This prioritizes `session.provider` over `payload.provider`.

**Why this is wrong:**
- `createMessageHandler` is a `useCallback` with `sessions` in dependencies
- React state updates are asynchronous
- When logs arrive, the callback might be using a stale `sessions` value
- If `session.provider` is undefined (stale state), it falls back to `payload.provider`
- But if `session.provider` exists but is wrong (e.g., from a previous session or migration issue), it uses the wrong value!

### Example Scenario

```
1. User creates Codex session
2. setSessions() called with provider='codex'
3. send() called → createMessageHandler() created
4. createMessageHandler captures current sessions state
5. State update hasn't propagated yet, sessions might be stale
6. Backend sends logs with provider='codex'
7. createMessageHandler executes
8. session?.provider might be undefined or 'cursor' (stale)
9. Falls through to payload.provider='codex' ✅
   OR uses session.provider='cursor' ❌ (if session exists but is stale)
```

## Solution

**Swap the priority** - Trust the backend payload over frontend session state:

```javascript
// OLD (wrong):
const provider = session?.provider || payload.provider || 'cursor';

// NEW (correct):
const provider = payload.provider || session?.provider || 'cursor';
```

**Rationale:**
- Backend payload contains the authoritative provider value
- Backend knows exactly which provider was used to run the agent
- Frontend session state might be stale due to React's async updates
- Payload provider is always fresh and correct

## Files Modified

### `renderer/src/components/Chat/hooks/useSessionManager.js:1122-1137`

```javascript
// Get the session to determine which provider to use
// Prioritize payload.provider (from backend) over session.provider (from frontend)
// This ensures we use the correct provider even if session state is stale
const session = sessions.find(s => s.id === sessionId);
const provider = payload.provider || session?.provider || 'cursor';

console.log(`🔍 createMessageHandler: Using provider "${provider}" for session ${sessionId.slice(0, 8)}`, {
  payloadProvider: payload.provider,
  sessionProvider: session?.provider,
  fallback: 'cursor',
  messageType: parsed.type,
  finalProvider: provider
});
```

## Complete Provider Flow

### 1. Session Creation
```javascript
// Chat.jsx:84-87
handleProviderSelect('codex');
  → createNewSession(null, null, 'codex')
  → Session saved with provider: 'codex'
```

### 2. Message Sending
```javascript
// useSessionManager.js:652
const provider = fullSessionObj.provider; // 'codex'
  → window.termiAI.runAgent({ provider: 'codex', ... })
```

### 3. Backend Processing
```javascript
// electron/main.cjs:1101
ipcMain.handle('agent-run', async (_e, { provider = 'cursor', ... }) => {
  // provider = 'codex'
  startAgent('codex', { ... }, (level, line, metadata) => {
    const logPayload = {
      provider, // 'codex'
      // ...
    };
    win.webContents.send('cursor-log', logPayload);
  });
});
```

### 4. Frontend Log Handling
```javascript
// useSessionManager.js:1126
const provider = payload.provider || session?.provider || 'cursor';
// provider = 'codex' (from payload)
  → messageHandler.handleParsedMessage(parsed, sessionId, 'codex')
```

### 5. Message Creation
```javascript
// useMessageHandler.js:147
addMessageToSession(sessionId, {
  provider: message.provider, // 'codex'
  // ...
});
```

### 6. Message Display
```javascript
// MessageList.jsx:52
<Bubble provider={m.provider} /> // 'codex'
  → Shows green 'CODEX' badge
```

## Testing

### Console Logs to Watch

When creating and using a Codex session, you should see:

```
✨ Creating new session with provider: codex
💾 Session xxx created and saved with provider: codex
🤖 Running agent with provider: codex
🔍 createMessageHandler: Using provider "codex" for session xxx
  payloadProvider: "codex"  ← This is the key value used
  sessionProvider: "codex"
  finalProvider: "codex"
[MessageHandler] CODEX → assistant: {...}
```

### Verification Steps

1. **Create Codex Session:**
   - Click "+ New Session"
   - Select "Codex"
   - Send a message

2. **Check Logs:**
   - Open DevTools console
   - Look for `payloadProvider: "codex"`
   - Verify `finalProvider: "codex"`

3. **Check UI:**
   - Header should show: `🔥 CODEX` (green badge)
   - Messages should have green `CODEX` badge

4. **Repeat for Claude:**
   - Create Claude session
   - Should show: `🤖 CLAUDE` (purple badge)

5. **Repeat for Cursor:**
   - Create Cursor session
   - Should show: `⚡ CURSOR` (blue badge)

## Why Payload is Authoritative

1. **Single Source of Truth:** Backend knows which provider it actually used
2. **Race Condition Proof:** Payload arrives with the message, not dependent on state timing
3. **Migration Proof:** Even if session migration fails, correct provider is used
4. **Debugging:** Payload logging shows exact provider value backend used

## Related Issues

This fix ensures:
- ✅ All providers show correct badges (Claude, Codex, Cursor)
- ✅ Provider is resilient to React state timing issues
- ✅ Works even if session state is corrupted
- ✅ Backend and frontend provider values are always in sync
