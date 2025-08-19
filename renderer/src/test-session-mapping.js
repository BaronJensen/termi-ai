/**
 * Unit tests for session mapping functionality
 * Tests the flow from cursor-agent responses to session state updates
 */

// Mock data from your terminal logs
const mockCursorAgentResponses = {
  session1: {
    runId: '1703123456789-abc123',
    sessionId: 'a655af1f-adb8-4211-8220-a8bd5c09d5fe',
    responses: [
      {
        level: 'json',
        line: JSON.stringify({
          "apiKeySource": "login",
          "cwd": "/Users/jensenbaronville/dev/projects/auto-cto",
          "model": "GPT-5",
          "permissionMode": "default",
          "session_id": "a655af1f-adb8-4211-8220-a8bd5c09d5fe",
          "subtype": "init",
          "type": "system"
        }),
        runId: '1703123456789-abc123',
        sessionId: 'temp-1703123456789-abc123',
        ts: Date.now()
      },
      {
        level: 'json',
        line: JSON.stringify({
          "message": {
            "content": [{"text": "hi. Avoid running build tools or scripts, we are already running the project", "type": "text"}],
            "role": "user"
          },
          "session_id": "a655af1f-adb8-4211-8220-a8bd5c09d5fe",
          "type": "user"
        }),
        runId: '1703123456789-abc123',
        sessionId: 'a655af1f-adb8-4211-8220-a8bd5c09d5fe',
        ts: Date.now()
      },
      {
        level: 'json',
        line: JSON.stringify({
          "message": {
            "content": [{"text": "Got", "type": "text"}],
            "role": "assistant"
          },
          "session_id": "a655af1f-adb8-4211-8220-a8bd5c09d5fe",
          "type": "assistant"
        }),
        runId: '1703123456789-abc123',
        sessionId: 'a655af1f-adb8-4211-8220-a8bd5c09d5fe',
        ts: Date.now()
      },
      {
        level: 'json',
        line: JSON.stringify({
          "duration_api_ms": 10804,
          "duration_ms": 10804,
          "is_error": false,
          "request_id": "4b891e24-b683-4a63-a645-5ad9f29cf240",
          "result": "Got it I'll avoid running build tools or scripts.\n\nHow can I help right now?\n- Review the current diffs and summarize changes\n- Stage and craft a commit (including new docs and `index.html`, remove `snake.html`)\n- Restore `snake.html` if deletion was accidental\n- Create a PR once the commit is ready\n- Something else?",
          "session_id": "a655af1f-adb8-4211-8220-a8bd5c09d5fe",
          "subtype": "success",
          "type": "result"
        }),
        runId: '1703123456789-abc123',
        sessionId: 'a655af1f-adb8-4211-8220-a8bd5c09d5fe',
        ts: Date.now()
      }
    ]
  },
  session2: {
    runId: '1703123456790-def456',
    sessionId: '0b21192b-6aaa-4ecf-90fa-9ee0dd2be31d',
    responses: [
      {
        level: 'json',
        line: JSON.stringify({
          "apiKeySource": "login",
          "cwd": "/Users/jensenbaronville/dev/projects/auto-cto",
          "model": "GPT-5",
          "permissionMode": "default",
          "session_id": "0b21192b-6aaa-4ecf-90fa-9ee0dd2be31d",
          "subtype": "init",
          "type": "system"
        }),
        runId: '1703123456790-def456',
        sessionId: 'temp-1703123456790-def456',
        ts: Date.now()
      },
      {
        level: 'json',
        line: JSON.stringify({
          "message": {
            "content": [{"text": "hi. Avoid running build tools or scripts, we are already running the project", "type": "text"}],
            "role": "user"
          },
          "session_id": "0b21192b-6aaa-4ecf-90fa-9ee0dd2be31d",
          "type": "user"
        }),
        runId: '1703123456790-def456',
        sessionId: '0b21192b-6aaa-4ecf-90fa-9ee0dd2be31d',
        ts: Date.now()
      },
      {
        level: 'json',
        line: JSON.stringify({
          "message": {
            "content": [{"text": "Got it", "type": "text"}],
            "role": "assistant"
          },
          "session_id": "0b21192b-6aaa-4ecf-90fa-9ee0dd2be31d",
          "type": "assistant"
        }),
        runId: '1703123456790-def456',
        sessionId: '0b21192b-6aaa-4ecf-90fa-9ee0dd2be31d',
        ts: Date.now()
      }
    ]
  }
};

// Mock session state
let mockSessions = [
  {
    id: 'session-1703123456789-abc123',
    name: 'Session 1',
    cursorSessionId: null,
    createdAt: Date.now() - 10000,
    updatedAt: Date.now() - 10000,
    messages: []
  },
  {
    id: 'session-1703123456790-def456', 
    name: 'Session 2',
    cursorSessionId: null,
    createdAt: Date.now() - 5000,
    updatedAt: Date.now() - 5000,
    messages: []
  }
];

// Mock functions
const mockSetSessions = (updateFn) => {
  if (typeof updateFn === 'function') {
    mockSessions = updateFn(mockSessions);
  } else {
    mockSessions = updateFn;
  }
  console.log('📝 Mock setSessions called, updated sessions:', mockSessions.map(s => ({
    id: s.id,
    name: s.name,
    cursorSessionId: s.cursorSessionId
  })));
};

const mockSaveSessions = (sessions) => {
  console.log('💾 Mock saveSessions called with:', sessions.map(s => ({
    id: s.id,
    name: s.name,
    cursorSessionId: s.cursorSessionId
  })));
};

// Mock updateSessionWithCursorId function
const mockUpdateSessionWithCursorId = (sessionId, cursorSessionId) => {
  console.log(`🔄 Mock updateSessionWithCursorId called with sessionId: ${sessionId}, cursorSessionId: ${cursorSessionId}`);
  console.log(`🔄 Current mock sessions:`, mockSessions.map(s => ({ id: s.id, name: s.name, cursorSessionId: s.cursorSessionId })));
  
  mockSetSessions(prevSessions => {
    let updatedSessions = [...prevSessions];
    
    // If we have a sessionId, update the existing session
    if (sessionId) {
      const existingSession = prevSessions.find(s => s.id === sessionId);
      if (existingSession) {
        // Update the existing (possibly temporary) session with the real cursor session ID
        updatedSessions = updatedSessions.map(session => 
          session.id === sessionId 
            ? { ...session, cursorSessionId, updatedAt: Date.now() }
            : session
        );
        console.log(`✅ Mock updated session ${sessionId} with cursor session ID: ${cursorSessionId}`);
      } else {
        console.warn(`❌ Mock session ${sessionId} not found, cannot update with cursor session ID`);
      }
    } else {
      // If no sessionId provided, try to find a temporary session (one without cursorSessionId)
      const tempSession = prevSessions.find(s => !s.cursorSessionId);
      if (tempSession) {
        // Update the temporary session with the real cursor session ID
        updatedSessions = updatedSessions.map(session => 
          session.id === tempSession.id 
            ? { ...session, cursorSessionId, updatedAt: Date.now() }
            : session
        );
        console.log(`✅ Mock updated temporary session ${tempSession.id} with cursor session ID: ${cursorSessionId}`);
      } else {
        // If no temporary session exists, create a new session with the cursorSessionId
        const newSession = {
          id: `session-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
          name: 'New Session',
          messages: [],
          cursorSessionId,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        updatedSessions.push(newSession);
        console.log(`✅ Mock created new session ${newSession.id} with cursor session ID: ${cursorSessionId}`);
      }
    }
    
    mockSaveSessions(updatedSessions);
    console.log(`🔄 Mock sessions after update:`, updatedSessions.map(s => ({ id: s.id, name: s.name, cursorSessionId: s.cursorSessionId })));
    return updatedSessions;
  });
};

// Import the actual message handler functions
import { handleJsonLogLine } from './components/Chat/hooks/messageHandlers.js';

// Test function
async function testSessionMapping() {
  console.log('🧪 Starting Session Mapping Tests');
  console.log('=====================================');
  
  // Test 1: First session mapping
  console.log('\n🧪 TEST 1: First Session Mapping');
  console.log('--------------------------------');
  
  const session1Responses = mockCursorAgentResponses.session1.responses;
  const currentSessionId = 'session-1703123456789-abc123';
  
  console.log(`Testing with currentSessionId: ${currentSessionId}`);
  console.log(`Initial sessions:`, mockSessions.map(s => ({ id: s.id, cursorSessionId: s.cursorSessionId })));
  
  // Process first response (system init with session_id)
  const firstResponse = JSON.parse(session1Responses[0].line);
  console.log('\nProcessing first response (system init):', firstResponse);
  
  try {
    await handleJsonLogLine(firstResponse, {
      runId: mockCursorAgentResponses.session1.runId,
      currentSessionId,
      sessions: mockSessions,
      setMessages: () => {},
      streamIndexRef: { current: -1 },
      setSessionToolCalls: () => {},
      getCurrentSessionToolCalls: () => new Map(),
      toolCallsRef: { current: new Map() },
      setSessionHideToolCallIndicators: () => {},
      accumulatedText: '',
      setAccumulatedText: () => {},
      lastChunkRef: { current: '' },
      setSessionBusy: () => {},
      runTimeoutRef: { current: null },
      unsubRef: { current: null },
      updateSessionWithCursorId: mockUpdateSessionWithCursorId
    });
    
    console.log('\n✅ First response processed successfully');
    console.log('Sessions after first response:', mockSessions.map(s => ({ id: s.id, cursorSessionId: s.cursorSessionId })));
    
  } catch (error) {
    console.error('❌ Error processing first response:', error);
  }
  
  // Test 2: Second session mapping
  console.log('\n🧪 TEST 2: Second Session Mapping');
  console.log('--------------------------------');
  
  const session2Responses = mockCursorAgentResponses.session2.responses;
  const currentSessionId2 = 'session-1703123456790-def456';
  
  console.log(`Testing with currentSessionId: ${currentSessionId2}`);
  console.log(`Sessions before second test:`, mockSessions.map(s => ({ id: s.id, cursorSessionId: s.cursorSessionId })));
  
  // Process second session's first response
  const secondSessionFirstResponse = JSON.parse(session2Responses[0].line);
  console.log('\nProcessing second session first response:', secondSessionFirstResponse);
  
  try {
    await handleJsonLogLine(secondSessionFirstResponse, {
      runId: mockCursorAgentResponses.session2.runId,
      currentSessionId: currentSessionId2,
      sessions: mockSessions,
      setMessages: () => {},
      streamIndexRef: { current: -1 },
      setSessionToolCalls: () => {},
      getCurrentSessionToolCalls: () => new Map(),
      toolCallsRef: { current: new Map() },
      setSessionHideToolCallIndicators: () => {},
      accumulatedText: '',
      setAccumulatedText: () => {},
      lastChunkRef: { current: '' },
      setSessionBusy: () => {},
      runTimeoutRef: { current: null },
      unsubRef: { current: null },
      updateSessionWithCursorId: mockUpdateSessionWithCursorId
    });
    
    console.log('\n✅ Second session response processed successfully');
    console.log('Final sessions state:', mockSessions.map(s => ({ id: s.id, cursorSessionId: s.cursorSessionId })));
    
  } catch (error) {
    console.error('❌ Error processing second session response:', error);
  }
  
  // Test 3: Verify session mapping worked
  console.log('\n🧪 TEST 3: Verification');
  console.log('----------------------');
  
  const session1 = mockSessions.find(s => s.id === 'session-1703123456789-abc123');
  const session2 = mockSessions.find(s => s.id === 'session-1703123456790-def456');
  
  console.log('Session 1:', session1 ? { id: session1.id, cursorSessionId: session1.cursorSessionId } : 'Not found');
  console.log('Session 2:', session2 ? { id: session2.id, cursorSessionId: session2.cursorSessionId } : 'Not found');
  
  // Verify expectations
  const session1HasCorrectId = session1?.cursorSessionId === 'a655af1f-adb8-4211-8220-a8bd5c09d5fe';
  const session2HasCorrectId = session2?.cursorSessionId === '0b21192b-6aaa-4ecf-90fa-9ee0dd2be31d';
  
  console.log('\n📊 Test Results:');
  console.log(`Session 1 cursor ID mapping: ${session1HasCorrectId ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Session 2 cursor ID mapping: ${session2HasCorrectId ? '✅ PASS' : '❌ FAIL'}`);
  
  if (session1HasCorrectId && session2HasCorrectId) {
    console.log('\n🎉 ALL TESTS PASSED! Session mapping is working correctly.');
  } else {
    console.log('\n💥 TESTS FAILED! Session mapping has issues.');
  }
  
  console.log('\n=====================================');
  console.log('🧪 Session Mapping Tests Complete');
}

// Test log router functionality
function testLogRouter() {
  console.log('\n🧪 Testing Log Router');
  console.log('=====================');
  
  // Mock log router
  const mockLogRouter = {
    handlers: new Map(),
    
    registerHandler(runId, handler) {
      console.log(`🔧 Mock router: registered handler for runId ${runId}`);
      this.handlers.set(runId, handler);
      console.log(`🔧 Mock router: total handlers: ${this.handlers.size}`);
    },
    
    routeLog(payload) {
      console.log(`🔧 Mock router: routing log for runId ${payload.runId}`);
      const handler = this.handlers.get(payload.runId);
      if (handler) {
        console.log(`✅ Mock router: found handler, calling it`);
        handler(payload);
      } else {
        console.log(`❌ Mock router: no handler found for runId ${payload.runId}`);
        console.log(`Available handlers:`, Array.from(this.handlers.keys()));
      }
    }
  };
  
  // Test handler registration
  const mockHandler = (payload) => {
    console.log(`📨 Mock handler received:`, payload);
  };
  
  mockLogRouter.registerHandler('test-run-123', mockHandler);
  
  // Test routing
  mockLogRouter.routeLog({
    runId: 'test-run-123',
    level: 'json',
    line: '{"test": "data"}',
    sessionId: 'test-session'
  });
  
  // Test routing with wrong runId
  mockLogRouter.routeLog({
    runId: 'wrong-run-456',
    level: 'json', 
    line: '{"test": "data"}',
    sessionId: 'test-session'
  });
}

// Export test functions for use in browser console
window.testSessionMapping = testSessionMapping;
window.testLogRouter = testLogRouter;
window.mockCursorAgentResponses = mockCursorAgentResponses;
window.mockSessions = mockSessions;

// Run tests automatically
console.log('🧪 Session Mapping Test Suite Loaded');
console.log('Run window.testSessionMapping() to test session mapping');
console.log('Run window.testLogRouter() to test log router');
console.log('Available mock data: window.mockCursorAgentResponses, window.mockSessions');

export { testSessionMapping, testLogRouter, mockCursorAgentResponses };
