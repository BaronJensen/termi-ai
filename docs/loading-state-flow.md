# Loading State Flow for AI Providers

## Codex Loading State Flow

### 1. User Submits Prompt
User types message and clicks send.

### 2. Backend Receives Prompt
- Codex CLI starts processing
- First output: `{"prompt": "user message here"}`

### 3. Backend Transformation (`CodexProvider.cjs`)
```javascript
if (parsed.prompt) {
  return {
    type: 'prompt',
    text: parsed.prompt,
    isStart: true
  };
}
```

### 4. Frontend Parser (`CodexMessageParser.js`)
```javascript
if (rawMessage.type === 'prompt' || msg.type === 'prompt' || rawMessage.prompt) {
  return parsePrompt(msg);
}

parsePrompt(msg) {
  return {
    type: MessageType.USER_PROMPT,
    provider: 'codex',
    data: { text: msg.text || msg.prompt },
    metadata: { isStart: true }  // ← LOADING TRIGGER
  };
}
```

### 5. Message Handler (`useMessageHandler.js`)
```javascript
case MessageType.USER_PROMPT:
  handleUserPrompt(message, sessionId);

handleUserPrompt(message, sessionId) {
  if (metadata.isStart) {
    setSessionBusy(sessionId, true);  // ← LOADER STARTS
    setSessionStreamingText(sessionId, '');
  }
}
```

### 6. Process Completion
- Codex sends: `{"msg": {"type": "agent_message", "message": "response"}}`
- Parsed as: `MessageType.ASSISTANT` with `metadata.isComplete = true`
- Handler stops loading: `setSessionBusy(sessionId, false)`

---

## Claude Code Loading State Flow

### 1. User Submits Prompt
User types message and clicks send.

### 2. Backend Receives Response
- Claude CLI starts processing
- First output: `{"type": "system", "subtype": "init", "text": "Initializing..."}`

### 3. Backend Transformation (`ClaudeProvider.cjs`)
```javascript
if (parsed.type === 'system' && parsed.subtype === 'init') {
  return {
    type: 'status',
    subtype: 'init',  // ← PRESERVED
    text: 'Claude Code initialized',
    session_id: parsed.session_id,
    model: parsed.model,
    tools: parsed.tools
  };
}
```

### 4. Frontend Parser (`ClaudeMessageParser.js`)
```javascript
case 'status':
  if (rawMessage.subtype === 'init') {
    return this.parseSystem(rawMessage);  // ← Treat as SYSTEM message
  }

parseSystem(msg) {
  return {
    type: MessageType.SYSTEM,
    provider: 'claude',
    data: {
      text: msg.text,
      subtype: msg.subtype  // ← 'init' PRESERVED
    }
  };
}
```

### 5. Message Handler (`useMessageHandler.js`)
```javascript
case MessageType.SYSTEM:
  handleSystemMessage(message, sessionId);

handleSystemMessage(message, sessionId) {
  if (data.subtype === 'init') {
    setSessionBusy(sessionId, true);  // ← LOADER STARTS
    setSessionStreamingText(sessionId, '');
  }
}
```

### 6. Process Completion
- Claude sends: `{"type": "result", "text": "response", "success": true}`
- Parsed as: `MessageType.RESULT`
- Handler stops loading: `setSessionBusy(sessionId, false)`

---

## Cursor Loading State Flow

### 1. User Submits Prompt
User types message and clicks send.

### 2. Backend Receives Response
- Cursor agent starts processing
- First output: `{"type": "status", "subtype": "init", "text": "Initializing..."}`

### 3. Frontend Parser (`CursorMessageParser.js`)
```javascript
case 'status':
case 'system':
  return this.parseStatus(rawMessage);

parseStatus(msg) {
  return {
    type: msg.subtype === 'init' ? MessageType.SYSTEM : MessageType.STATUS,
    provider: 'cursor',
    data: {
      text: msg.text,
      subtype: msg.subtype  // ← 'init' PRESERVED
    }
  };
}
```

### 4. Message Handler (`useMessageHandler.js`)
Same as Claude - checks for `data.subtype === 'init'`

### 5. Process Completion
- Cursor sends: `{"type": "result", "result": "response"}`
- Parsed as: `MessageType.RESULT`
- Handler stops loading: `setSessionBusy(sessionId, false)`

---

## Key Points

✅ **Codex**: Loading triggered by `type: 'prompt'` → `MessageType.USER_PROMPT` with `metadata.isStart`
✅ **Claude**: Loading triggered by `type: 'status'` with `subtype: 'init'` → `MessageType.SYSTEM` with `data.subtype`
✅ **Cursor**: Loading triggered by `type: 'status'` with `subtype: 'init'` → `MessageType.SYSTEM` with `data.subtype`

All providers stop loading on `MessageType.RESULT` or final `MessageType.ASSISTANT` messages.
