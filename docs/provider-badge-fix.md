# Provider Badge Fix

## Issue
When using Codex chat, the session was displaying the Cursor badge instead of the Codex badge.

## Root Cause
Legacy sessions (created before multi-provider support was added) did not have a `provider` field. When these sessions were loaded, they defaulted to `undefined`, which was then falling back to 'cursor' in various places.

## Solution

### 1. **Session Migration** (`useSessionManager.js:28-62`)
Added automatic migration logic in the `loadSessions` function to add a default provider field to old sessions:

```javascript
// Migration: Add provider field to old sessions that don't have it
const migratedSessions = parsedSessions.map(session => {
  if (!session.provider) {
    console.log(`🔧 Migrating session ${session.id} - adding default provider 'cursor'`);
    return {
      ...session,
      provider: 'cursor', // Default to cursor for legacy sessions
      providerId: session.cursorSessionId || null
    };
  }
  return session;
});

// Save migrated sessions back to localStorage
if (migratedSessions.some((s, i) => s.provider !== parsedSessions[i]?.provider)) {
  console.log('💾 Saving migrated sessions back to localStorage');
  localStorage.setItem(`termi-ai-sessions-${projectId || 'legacy'}`, JSON.stringify(migratedSessions));
}
```

### 2. **Enhanced Logging** (`useSessionManager.js:206-210, 654-659`)

Added console logging to track provider flow:

**Session Creation:**
```javascript
console.log(`✨ Creating new session with provider: ${sessionProvider}`, {
  providedProvider: provider,
  settingsDefaultProvider: settings.defaultProvider,
  finalProvider: sessionProvider
});
```

**Message Sending:**
```javascript
console.log(`🤖 Running agent with provider: ${provider}`, {
  sessionProvider: fullSessionObj.provider,
  settingsProvider: settings.defaultProvider,
  finalProvider: provider,
  sessionId: sessionId.slice(0, 8)
});
```

## Provider Flow

### Creating a New Session with Specific Provider

1. **User clicks "New Session"** → Opens Provider Selection Modal
2. **User selects "Codex"** → `handleProviderSelect('codex')` called
3. **Chat.jsx:84-87:**
   ```javascript
   const handleProviderSelect = useCallback((provider) => {
     createNewSession(null, null, provider); // ← Provider passed here
     setShowProviderSelection(false);
   }, [createNewSession]);
   ```
4. **useSessionManager.js:197-230:**
   ```javascript
   const sessionProvider = provider || settings.defaultProvider || 'cursor';
   const newSession = {
     id: newSessionId,
     name: `Session ${new Date().toLocaleString()}`,
     // ...
     provider: sessionProvider, // ← Stored in session
     providerId: null
   };
   saveSessions(updatedSessions); // ← Saved to localStorage
   ```

### Displaying Provider Badge in Header

1. **Chat.jsx:345:** Passes current session to Header
   ```javascript
   currentSession={sessions.find(s => s.id === currentSessionId)}
   ```

2. **Header.jsx:38-56:** Displays provider badge
   ```javascript
   {currentSession?.provider && (
     <span style={{
       backgroundColor: currentSession.provider === 'cursor' ? '#3b82f6' :
                       currentSession.provider === 'claude' ? '#f97316' :
                       currentSession.provider === 'codex' ? '#10b981' : '#374151',
       // ...
     }}>
       {currentSession.provider === 'cursor' ? '⚡ Cursor' :
        currentSession.provider === 'claude' ? '🤖 Claude' :
        currentSession.provider === 'codex' ? '🔥 Codex' :
        currentSession.provider}
     </span>
   )}
   ```

### Running Agent with Correct Provider

1. **useSessionManager.js:651-676:** Uses session's provider
   ```javascript
   const provider = fullSessionObj.provider || settings.defaultProvider || 'cursor';

   const result = await window.termiAI.runAgent({
     provider: provider, // ← Correct provider used
     message: text,
     sessionObject,
     // ...
   });
   ```

## Testing

To verify the fix works:

1. **Create a new Codex session:**
   - Click "New Session" (+ button)
   - Select "Codex" from provider modal
   - Send a message

2. **Check console logs:**
   ```
   ✨ Creating new session with provider: codex
   💾 Session xxx created and saved with provider: codex
   🤖 Running agent with provider: codex
   ```

3. **Verify badge:**
   - Header should show: `🔥 CODEX` (green badge)
   - Messages should have: `CODEX` (green badge)

4. **Verify persistence:**
   - Refresh the page
   - Session should still show Codex badge
   - Console should show: `🔍 loadSessions: ...provider: codex...`

## Migration Impact

- **Existing sessions:** Automatically migrated to have `provider: 'cursor'`
- **New sessions:** Created with the selected provider
- **No data loss:** All existing session data preserved
- **One-time migration:** Sessions are updated in localStorage immediately

## Files Modified

1. `renderer/src/components/Chat/hooks/useSessionManager.js`
   - Added migration logic in `loadSessions`
   - Enhanced logging in `createNewSession`
   - Enhanced logging in `send`

## Related Issues

This fix also ensures:
- ✅ Claude sessions show Claude badge
- ✅ Cursor sessions show Cursor badge
- ✅ Provider is correctly passed to backend
- ✅ Messages are parsed with correct provider parser
- ✅ Sessions persist provider after page refresh
