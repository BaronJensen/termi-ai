# Session Utilities

This directory contains utility functions for session management and JSON parsing, particularly focused on handling cursor session IDs and JSON message processing.

## Functions

### `parseCursorLogPayload(payload, options)`

Parses a cursor log payload and extracts the message content from JSON messages.

**Parameters:**

- `payload` (object): The raw cursor log payload from the backend
- `options` (object, optional): Configuration options
  - `logging` (boolean): Enable detailed logging (default: true)

**Returns:** `object|null` - Parsed message object or null if not parseable

**Example:**

```javascript
import { parseCursorLogPayload } from "../utils/sessionUtils";

const message = parseCursorLogPayload({
  level: "json",
  line: '{"type":"session_start","session_id":"abc123"}',
  runId: "run-123",
  id: "session-456",
});
// Returns: { type: "session_start", session_id: "abc123" }
```

### `extractSessionIdFromJson(jsonLine, options)`

Extracts a `session_id` field from a JSON string with comprehensive error handling and logging.

**Parameters:**

- `jsonLine` (string): The JSON string to parse
- `options` (object, optional): Configuration options
  - `logging` (boolean): Enable detailed logging (default: true)
  - `validateCompleteness` (boolean): Check if JSON appears complete (default: true)

**Returns:** `string|null` - The extracted session_id or null if not found/parseable

**Example:**

```javascript
import { extractSessionIdFromJson } from "../utils/sessionUtils";

// Basic usage
const sessionId = extractSessionIdFromJson(
  '{"type":"session_start","session_id":"abc123"}'
);
// Returns: "abc123"

// With options
const sessionId = extractSessionIdFromJson(jsonLine, {
  logging: false,
  validateCompleteness: false,
});

// Handle incomplete JSON
const sessionId = extractSessionIdFromJson(
  '{"type":"session_start","session_id":"abc123"'
);
// Returns: null (and logs warning about incomplete JSON)
```

### `isCompleteJson(jsonLine)`

Checks if a JSON string appears to be complete by verifying it starts with `{` and ends with `}`.

**Parameters:**

- `jsonLine` (string): The JSON string to check

**Returns:** `boolean` - True if the JSON appears complete

**Example:**

```javascript
import { isCompleteJson } from "../utils/sessionUtils";

isCompleteJson('{"key":"value"}'); // Returns: true
isCompleteJson('{"key":"value"'); // Returns: false
isCompleteJson('{"key":"value"} extra'); // Returns: false
```

### `safeJsonParse(jsonString, fallback)`

Safely parses JSON with error handling, returning a fallback value if parsing fails.

**Parameters:**

- `jsonString` (string): The JSON string to parse
- `fallback` (any): Value to return if parsing fails (default: null)

**Returns:** `any` - The parsed JSON object or fallback value

**Example:**

```javascript
import { safeJsonParse } from "../utils/sessionUtils";

safeJsonParse('{"key":"value"}'); // Returns: { key: "value" }
safeJsonParse("invalid json"); // Returns: null
safeJsonParse("invalid json", {}); // Returns: {}
```

### `extractFieldsFromJson(jsonLine, fields, options)`

Extracts multiple fields from a JSON string, useful for getting multiple values in one parse operation.

**Parameters:**

- `jsonLine` (string): The JSON string to parse
- `fields` (string[]): Array of field names to extract
- `options` (object, optional): Configuration options
  - `logging` (boolean): Enable detailed logging (default: true)

**Returns:** `object` - Object with extracted fields, null for missing fields

**Example:**

```javascript
import { extractFieldsFromJson } from "../utils/sessionUtils";

const result = extractFieldsFromJson(
  '{"type":"session_start","session_id":"abc123","message":"hello"}',
  ["type", "session_id"]
);
// Returns: { type: "session_start", session_id: "abc123" }
```

## Use Cases

### 1. Parsing Cursor Log Payloads

When receiving raw payloads from the backend that need to be parsed:

```javascript
import { parseCursorLogPayload } from "../utils/sessionUtils";

// In your message handler
if (payload.level === "json") {
  const parsedMessage = parseCursorLogPayload(payload);
  if (parsedMessage && payload.id) {
    // Process the parsed message
    messageHandler.handleParsedMessage(parsedMessage, payload.id);
  }
}
```

### 2. Session ID Extraction from JSON Messages

When receiving JSON messages from the backend that contain session IDs:

```javascript
import { extractSessionIdFromJson } from "../utils/sessionUtils";

// In your message handler
if (payload.level === "json" && !payload.cursorSessionId && payload.line) {
  const sessionId = extractSessionIdFromJson(payload.line);
  if (sessionId) {
    // Update session with the extracted cursor session ID
    updateSessionWithCursorId(payload.id, sessionId);
  }
}
```

### 2. Safe JSON Parsing

When you need to parse JSON without throwing errors:

```javascript
import { safeJsonParse } from "../utils/sessionUtils";

const parsed = safeJsonParse(jsonString, {});
if (parsed.type === "session_start") {
  // Handle session start
}
```

### 3. JSON Completeness Validation

When you need to check if JSON is complete before parsing:

```javascript
import { isCompleteJson } from "../utils/sessionUtils";

if (isCompleteJson(jsonLine)) {
  const parsed = JSON.parse(jsonLine);
  // Process the complete JSON
} else {
  // Buffer the incomplete JSON for later
}
```

## Error Handling

All functions include comprehensive error handling:

- **Invalid input**: Functions return appropriate fallback values for invalid inputs
- **JSON parsing errors**: Catches and logs JSON parsing errors without crashing
- **Missing fields**: Gracefully handles missing fields in JSON objects
- **Incomplete JSON**: Detects and warns about potentially incomplete JSON messages

## Logging

Functions include detailed logging by default to help with debugging:

- **Success cases**: Log when session IDs are successfully extracted
- **Error cases**: Log parsing errors and raw content for debugging
- **Completeness warnings**: Warn about potentially incomplete JSON messages
- **Configurable**: Logging can be disabled via options for production use

## Performance Considerations

- Functions are lightweight and designed for frequent use
- JSON parsing is only performed when necessary
- Early returns for invalid inputs prevent unnecessary processing
- Logging can be disabled to improve performance in production
