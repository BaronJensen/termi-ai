#!/bin/bash

# Test script to simulate cursor-agent responses
# This avoids calling the actual terminal multiple times

echo "🧪 Testing Session Mapping with Mock Cursor-Agent Responses"
echo "=========================================================="

echo ""
echo "📋 Test Case 1: First Session - Initial Response"
echo "Session ID: a655af1f-adb8-4211-8220-a8bd5c09d5fe"
echo "RunID: 1703123456789-abc123"
echo ""

# Simulate the first response (system init)
echo '{"apiKeySource":"login","cwd":"/Users/jensenbaronville/dev/projects/auto-cto","model":"GPT-5","permissionMode":"default","session_id":"a655af1f-adb8-4211-8220-a8bd5c09d5fe","subtype":"init","type":"system"}'

echo ""
echo "📋 Test Case 2: First Session - User Message"
echo ""

# Simulate user message
echo '{"message":{"content":[{"text":"hi. Avoid running build tools or scripts, we are already running the project","type":"text"}],"role":"user"},"session_id":"a655af1f-adb8-4211-8220-a8bd5c09d5fe","type":"user"}'

echo ""
echo "📋 Test Case 3: First Session - Assistant Response"
echo ""

# Simulate assistant response
echo '{"message":{"content":[{"text":"Got it","type":"text"}],"role":"assistant"},"session_id":"a655af1f-adb8-4211-8220-a8bd5c09d5fe","type":"assistant"}'

echo ""
echo "📋 Test Case 4: First Session - Final Result"
echo ""

# Simulate final result
echo '{"duration_api_ms":10804,"duration_ms":10804,"is_error":false,"request_id":"4b891e24-b683-4a63-a645-5ad9f29cf240","result":"Got it I will avoid running build tools or scripts.\n\nHow can I help right now?\n- Review the current diffs and summarize changes\n- Stage and craft a commit\n- Create a PR once ready\n- Something else?","session_id":"a655af1f-adb8-4211-8220-a8bd5c09d5fe","subtype":"success","type":"result"}'

echo ""
echo "=========================================================="
echo "📋 Test Case 5: Second Session - Different Session ID"
echo "Session ID: 0b21192b-6aaa-4ecf-90fa-9ee0dd2be31d"
echo "RunID: 1703123456790-def456"
echo ""

# Simulate second session init
echo '{"apiKeySource":"login","cwd":"/Users/jensenbaronville/dev/projects/auto-cto","model":"GPT-5","permissionMode":"default","session_id":"0b21192b-6aaa-4ecf-90fa-9ee0dd2be31d","subtype":"init","type":"system"}'

echo ""
echo "📋 Test Case 6: Second Session - User Message"
echo ""

# Simulate second session user message
echo '{"message":{"content":[{"text":"hi. Avoid running build tools or scripts, we are already running the project","type":"text"}],"role":"user"},"session_id":"0b21192b-6aaa-4ecf-90fa-9ee0dd2be31d","type":"user"}'

echo ""
echo "📋 Test Case 7: Second Session - Assistant Response"
echo ""

# Simulate second session assistant response
echo '{"message":{"content":[{"text":"Got it I will avoid running any build tools or scripts.","type":"text"}],"role":"assistant"},"session_id":"0b21192b-6aaa-4ecf-90fa-9ee0dd2be31d","type":"assistant"}'

echo ""
echo "=========================================================="
echo "🧪 Test Complete"
echo ""
echo "Expected Results:"
echo "- Session 1 should be mapped to: a655af1f-adb8-4211-8220-a8bd5c09d5fe"
echo "- Session 2 should be mapped to: 0b21192b-6aaa-4ecf-90fa-9ee0dd2be31d"
echo "- Both sessions should have their cursorSessionId updated"
echo ""
echo "To test:"
echo "1. Open the session info panel in the chat"
echo "2. Check if cursorSessionId is populated after first message"
echo "3. Send second message and verify sessionId is used"
echo "4. Switch between sessions and verify isolation"
echo ""
