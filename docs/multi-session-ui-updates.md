# Multi-Session UI Updates

## Overview

This document describes the updates made to the Cursovable UI to support multiple concurrent cursor-agent terminals, allowing users to run multiple chat sessions simultaneously and navigate between them without killing active processes.

## Key Changes Made

### 1. **Chat.jsx Component Updates**

#### Busy State Management

- **Replaced global `busy` state** with `busyBySession` Map
- **Added helper functions** for per-session busy state management:
  ```javascript
  const isSessionBusy = (sessionId) => busyBySession.get(sessionId) || false;
  const setSessionBusy = (sessionId, busy) => {
    /* update Map */
  };
  const getCurrentSessionBusy = () =>
    currentSessionId ? isSessionBusy(currentSessionId) : false;
  ```

#### Session Navigation

- **Updated `loadSession` function** to preserve other sessions' busy state
- **Added session switching** without killing active processes
- **Enhanced session creation** with `cursorSessionId` tracking

#### UI State Updates

- **Updated `StatusIndicators`** to show current session's busy state
- **Updated `InputBar`** to disable only when current session is busy
- **Updated `SessionList`** to display which sessions are currently running

### 2. **useChatSend Hook Updates**

#### Busy State Integration

- **Changed from `setBusy`** to `setSessionBusy(currentSessionId, busy)`
- **Updated validation** to use `getCurrentSessionBusy()`
- **Modified all cleanup functions** to use session-specific busy state

#### Session Management

- **Added `updateSessionWithCursorId`** function to handle first message case
- **Updated dependency arrays** to include new session management functions

### 3. **SessionList Component Updates**

#### Busy State Display

- **Added `busyBySession` prop** to show running sessions
- **Added visual indicators** for sessions currently running:
  - 🔄 RUNNING indicator for busy sessions
  - ACTIVE indicator for current session
- **Enhanced session information** display

## How It Works Now

### 🚀 **Concurrent Session Support**

1. **Multiple Sessions Can Run Simultaneously**

   - Each session has its own busy state
   - Sessions don't block each other
   - Independent terminal processes per session

2. **Session Navigation Without Killing**

   - Switch between sessions freely
   - Active sessions continue running
   - No interruption to ongoing work

3. **First Message Handling**
   - New sessions start without `cursorSessionId`
   - After first response, session is updated with cursor session ID
   - Subsequent messages use the established session

### 📱 **UI Behavior**

#### Input Bar

- **Disabled only when current session is busy**
- **Other sessions can still send messages**
- **Clear visual feedback** about current session status

#### Session List

- **Shows which sessions are running** (🔄 RUNNING)
- **Shows which session is active** (ACTIVE)
- **Real-time updates** of session status

#### Status Indicators

- **Display current session's busy state**
- **Don't interfere with other sessions**
- **Accurate status per session**

## Technical Implementation

### State Management

```javascript
// Before: Single global busy state
const [busy, setBusy] = useState(false);

// After: Per-session busy state
const [busyBySession, setBusyBySession] = useState(new Map());
const setSessionBusy = (sessionId, busy) => {
  /* update Map */
};
const getCurrentSessionBusy = () =>
  currentSessionId ? isSessionBusy(currentSessionId) : false;
```

### Session Tracking

```javascript
// Track busy state per session
const setSessionBusy = (sessionId, busy) => {
  setBusyBySession((prev) => {
    const next = new Map(prev);
    if (busy) {
      next.set(sessionId, true);
    } else {
      next.delete(sessionId);
    }
    return next;
  });
};
```

### UI Updates

```javascript
// Input bar only disabled for current session
<InputBar
  disabled={getCurrentSessionBusy() || !cwd}
  // ... other props
/>

// Status indicators show current session status
<StatusIndicators busy={getCurrentSessionBusy()} />
```

## Benefits

### 🔍 **Better User Experience**

- **No more waiting** for one session to complete
- **Work on multiple projects** simultaneously
- **Easy session switching** without losing progress

### 📊 **Clear Status Visibility**

- **See which sessions are running**
- **Understand current session state**
- **Monitor multiple workflows** at once

### 🚀 **Improved Workflow**

- **Parallel development** on different features
- **Context switching** without interruption
- **Better resource utilization**

## Usage Examples

### Starting Multiple Sessions

```javascript
// Session 1 starts
await send("Work on feature A");

// Switch to Session 2 (Session 1 continues running)
loadSession("session-2");
await send("Work on feature B");

// Switch back to Session 1 (Session 2 continues running)
loadSession("session-1");
// Session 1 is still running, can continue working
```

### Session Status Monitoring

```javascript
// Check which sessions are busy
console.log("Session status:", getSessionStatus());
// Output: {
//   currentSessionId: "session-1",
//   currentSessionBusy: false,
//   allSessionsBusy: { "session-2": true },
//   totalBusySessions: 1
// }
```

## Future Enhancements

### Potential Improvements

1. **Session Groups** - Group related sessions together
2. **Resource Monitoring** - Show CPU/memory usage per session
3. **Session Templates** - Pre-configured session configurations
4. **Cross-Session Communication** - Allow sessions to share data
5. **Session Analytics** - Track performance and usage patterns

### UI Enhancements

1. **Session Dashboard** - Overview of all active sessions
2. **Process Management** - Kill/restart specific sessions
3. **Session History** - Track session lifecycle events
4. **Performance Metrics** - Show session resource usage

## Testing

### Manual Testing Steps

1. **Create multiple sessions** and verify they can run concurrently
2. **Switch between sessions** and confirm others continue running
3. **Check busy state** updates in real-time
4. **Verify first message handling** for new sessions
5. **Test session cleanup** and state management

### Expected Behavior

- ✅ Multiple sessions can run simultaneously
- ✅ Session switching doesn't kill other sessions
- ✅ UI accurately reflects each session's busy state
- ✅ First message creates session, subsequent messages resume
- ✅ Session list shows running/active status correctly

## Troubleshooting

### Common Issues

#### Session Not Starting

- Check if `currentSessionId` is set
- Verify `setSessionBusy` is called correctly
- Check console for session status logs

#### Busy State Not Updating

- Ensure `busyBySession` Map is being updated
- Check `setSessionBusy` function calls
- Verify session ID consistency

#### UI Not Reflecting Status

- Check `getCurrentSessionBusy()` function
- Verify component props are passed correctly
- Check React state updates

### Debug Mode

Enable debug logging to see session status changes:

```javascript
// Session status is logged automatically
console.log("Session status updated:", getSessionStatus());
```

## Conclusion

The multi-session UI updates enable true concurrent development workflows, allowing users to work on multiple projects simultaneously without interference. The per-session busy state management and enhanced session navigation provide a much more flexible and efficient development experience.
