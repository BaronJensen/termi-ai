# 🧪 Cursovable Debug Mode - Quick Reference

## What is Debug Mode?

Debug mode allows you to test Cursovable without calling the real `cursor-agent` CLI. Instead, it uses a mock data generator that simulates realistic responses.

## Quick Start

### Enable Debug Mode

**Option 1: Environment Variable**

```bash
export CURSOVABLE_DEBUG_MODE=1
npm run dev
```

**Option 2: UI Toggle**

- Look for the "Debug Mode" button in the app header
- Click to toggle between real CLI and mock data
- When active, button shows "🧪 Mock"

**Option 3: Per-Request**

```javascript
await window.cursovable.invoke("cursor-run", {
  message: "Help me with this code",
  debugMode: true, // This request uses mock data
});
```

### Disable Debug Mode

**Option 1: Environment Variable**

```bash
unset CURSOVABLE_DEBUG_MODE
```

**Option 2: UI Toggle**

- Click the debug mode button again

**Option 3: IPC Call**

```javascript
await window.cursovable.invoke("debug-mode-set", { enabled: false });
```

## Mock Data Structure

The mock generator produces realistic JSON responses with full session support:

- **Session Start**: Initial session metadata and configuration
- **Assistant Messages**: Simulated AI responses with session tracking
- **Tool Calls**: Mock function calls (file_search, etc.)
- **Tool Results**: Simulated tool execution results
- **Final Results**: Success/error completion messages
- **Session End**: Session completion statistics and duration

## Configuration

Customize mock behavior with timing options:

```javascript
await window.cursovable.invoke("debug-mode-set", {
  enabled: true,
  options: {
    mockTypingDelay: 100, // ms between characters
    mockMessageDelay: 2000, // ms between messages
    mockFinalDelay: 1000, // ms before final result
  },
});
```

## Use Cases

- **Development**: Test UI changes without API calls
- **Testing**: Verify error handling and edge cases
- **Demo**: Show app functionality without dependencies
- **Debugging**: Isolate UI logic from API responses
- **CI/CD**: Run tests without cursor-agent access

## Testing

Run the test scripts to verify functionality:

```bash
# Basic mock data test
node test-debug-mode.js

# Integration test
node test-debug-integration.js

# Full demonstration
node demo-debug-mode.js
```

## Status Indicators

When debug mode is active, you'll see:

- 🧪 Button shows "Mock" instead of "Debug Mode"
- Status shows "🧪 DEBUG MODE ACTIVE"
- Console logs indicate mock data generation
- No real cursor-agent CLI calls

## Troubleshooting

**Mock data not appearing?**

- Check debug mode is enabled
- Verify console logs for debug indicators
- Ensure mock generator is running

**Timing issues?**

- Adjust mock timing options
- Check for timer conflicts

**Integration problems?**

- Verify IPC handlers are registered
- Check mock generator imports
- Ensure runner integration is correct

## Architecture

```
MockDataGenerator → Runner Integration → IPC Handlers → UI Controls
       ↓                    ↓              ↓           ↓
   Generates           Routes to       Runtime      Toggle
   Mock Data          Mock/Real       Control      Button
```

## Files Modified

- `electron/mockDataGenerator.cjs` - Mock data generator
- `electron/runner.cjs` - Debug mode integration
- `electron/main.cjs` - IPC handlers
- `electron/preload.cjs` - Renderer API
- `renderer/src/App.jsx` - UI controls
- `renderer/index.html` - Styling

## Benefits

✅ **Safe Testing** - No real API calls
✅ **Fast Development** - Consistent responses
✅ **No Dependencies** - Works without cursor-agent
✅ **Easy Toggle** - Enable/disable on demand
✅ **Realistic Data** - Matches real CLI format
✅ **Configurable** - Customize timing and behavior

---

**Happy Debugging! 🧪✨**
