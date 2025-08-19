#!/usr/bin/env node

/**
 * Node.js test runner for session mapping functionality
 * This tests the core logic without browser dependencies
 */

console.log('🧪 Session Mapping Test Suite (Node.js)');
console.log('========================================');

// Mock sessions data
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

// Mock cursor-agent responses
const mockResponses = {
  session1: {
    runId: '1703123456789-abc123',
    cursorSessionId: 'a655af1f-adb8-4211-8220-a8bd5c09d5fe',
    responses: [
      {
        "apiKeySource": "login",
        "cwd": "/Users/jensenbaronville/dev/projects/auto-cto",
        "model": "GPT-5",
        "permissionMode": "default",
        "session_id": "a655af1f-adb8-4211-8220-a8bd5c09d5fe",
        "subtype": "init",
        "type": "system"
      },
      {
        "message": {
          "content": [{"text": "Got it", "type": "text"}],
          "role": "assistant"
        },
        "session_id": "a655af1f-adb8-4211-8220-a8bd5c09d5fe",
        "type": "assistant"
      }
    ]
  },
  session2: {
    runId: '1703123456790-def456',
    cursorSessionId: '0b21192b-6aaa-4ecf-90fa-9ee0dd2be31d',
    responses: [
      {
        "apiKeySource": "login",
        "cwd": "/Users/jensenbaronville/dev/projects/auto-cto",
        "model": "GPT-5",
        "permissionMode": "default",
        "session_id": "0b21192b-6aaa-4ecf-90fa-9ee0dd2be31d",
        "subtype": "init",
        "type": "system"
      }
    ]
  }
};

// Mock updateSessionWithCursorId function
function mockUpdateSessionWithCursorId(sessionId, cursorSessionId) {
  console.log(`🔄 updateSessionWithCursorId called with sessionId: ${sessionId}, cursorSessionId: ${cursorSessionId}`);
  console.log(`🔄 Current sessions:`, mockSessions.map(s => ({ id: s.id, name: s.name, cursorSessionId: s.cursorSessionId })));
  
  // If we have a sessionId, update the existing session
  if (sessionId) {
    const existingSession = mockSessions.find(s => s.id === sessionId);
    if (existingSession) {
      // Update the existing session with the real cursor session ID
      existingSession.cursorSessionId = cursorSessionId;
      existingSession.updatedAt = Date.now();
      console.log(`✅ Updated session ${sessionId} with cursor session ID: ${cursorSessionId}`);
    } else {
      console.warn(`❌ Session ${sessionId} not found, cannot update with cursor session ID`);
    }
  } else {
    // If no sessionId provided, try to find a temporary session (one without cursorSessionId)
    const tempSession = mockSessions.find(s => !s.cursorSessionId);
    if (tempSession) {
      // Update the temporary session with the real cursor session ID
      tempSession.cursorSessionId = cursorSessionId;
      tempSession.updatedAt = Date.now();
      console.log(`✅ Updated temporary session ${tempSession.id} with cursor session ID: ${cursorSessionId}`);
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
      mockSessions.push(newSession);
      console.log(`✅ Created new session ${newSession.id} with cursor session ID: ${cursorSessionId}`);
    }
  }
  
  console.log(`🔄 Sessions after update:`, mockSessions.map(s => ({ id: s.id, name: s.name, cursorSessionId: s.cursorSessionId })));
}

// Mock handleJsonLogLine function (simplified version)
async function mockHandleJsonLogLine(parsed, options) {
  console.log('🔥 handleJsonLogLine called with parsed:', parsed);
  console.log('🔥 Has session_id:', !!parsed.session_id, 'session_id:', parsed.session_id);
  
  // Extract session ID if present and find the correct session to route this message to
  let targetSessionId = options.currentSessionId;
  console.log('Session routing:', {
    currentSessionId: options.currentSessionId,
    parsedSessionId: parsed.session_id,
    sessionsCount: options.sessions.length,
    sessionIds: options.sessions.map(s => ({ id: s.id, cursorSessionId: s.cursorSessionId }))
  });
  
  if (parsed.session_id) {
    // Find the session that has this cursor-agent session ID
    const sessionWithCursorId = options.sessions.find(s => s.cursorSessionId === parsed.session_id);
    if (sessionWithCursorId) {
      targetSessionId = sessionWithCursorId.id;
      console.log(`Routing message to session: ${targetSessionId} (cursor-agent session: ${parsed.session_id})`);
    } else {
      // New cursor-agent session detected
      console.log(`🆔 New cursor-agent session detected: ${parsed.session_id}`);
      console.log(`🆔 Current sessionId: ${options.currentSessionId}`);
      console.log(`🆔 Available sessions:`, options.sessions.map(s => ({ id: s.id, name: s.name, cursorSessionId: s.cursorSessionId })));
      
      // Check if we have a current session without a cursorSessionId (temporary session)
      const currentSession = options.sessions.find(s => s.id === options.currentSessionId);
      console.log(`🆔 Found current session:`, currentSession ? { id: currentSession.id, name: currentSession.name, cursorSessionId: currentSession.cursorSessionId } : null);
      
      if (currentSession && !currentSession.cursorSessionId) {
        // Update the temporary session with the real cursor session ID
        console.log(`🆔 Updating temporary session ${options.currentSessionId} with cursor session ID: ${parsed.session_id}`);
        if (options.updateSessionWithCursorId) {
          options.updateSessionWithCursorId(options.currentSessionId, parsed.session_id);
        }
        targetSessionId = options.currentSessionId;
      } else {
        // Either no current session or current session already has a cursorSessionId
        // Let updateSessionWithCursorId handle creating a new session or finding a temp session
        console.log(`🆔 No suitable session found, letting updateSessionWithCursorId handle it`);
        console.log(`🆔 Current session exists: ${!!currentSession}, has cursorSessionId: ${currentSession?.cursorSessionId}`);
        if (options.updateSessionWithCursorId) {
          options.updateSessionWithCursorId(null, parsed.session_id);
        }
        // targetSessionId will remain currentSessionId for now
      }
    }
  }
  
  console.log('Final target session ID:', targetSessionId);
  return false; // Not complete
}

// Test functions
async function testSession1Mapping() {
  console.log('\n🧪 TEST 1: First Session Mapping');
  console.log('--------------------------------');
  
  const currentSessionId = 'session-1703123456789-abc123';
  const response = mockResponses.session1.responses[0];
  
  console.log(`Testing with currentSessionId: ${currentSessionId}`);
  console.log(`Initial sessions:`, mockSessions.map(s => ({ id: s.id, cursorSessionId: s.cursorSessionId })));
  console.log('\nProcessing response:', response);
  
  await mockHandleJsonLogLine(response, {
    runId: mockResponses.session1.runId,
    currentSessionId,
    sessions: mockSessions,
    updateSessionWithCursorId: mockUpdateSessionWithCursorId
  });
  
  console.log('\n✅ First session test completed');
  console.log('Sessions after test:', mockSessions.map(s => ({ id: s.id, cursorSessionId: s.cursorSessionId })));
}

async function testSession2Mapping() {
  console.log('\n🧪 TEST 2: Second Session Mapping');
  console.log('--------------------------------');
  
  const currentSessionId = 'session-1703123456790-def456';
  const response = mockResponses.session2.responses[0];
  
  console.log(`Testing with currentSessionId: ${currentSessionId}`);
  console.log(`Sessions before test:`, mockSessions.map(s => ({ id: s.id, cursorSessionId: s.cursorSessionId })));
  console.log('\nProcessing response:', response);
  
  await mockHandleJsonLogLine(response, {
    runId: mockResponses.session2.runId,
    currentSessionId,
    sessions: mockSessions,
    updateSessionWithCursorId: mockUpdateSessionWithCursorId
  });
  
  console.log('\n✅ Second session test completed');
  console.log('Sessions after test:', mockSessions.map(s => ({ id: s.id, cursorSessionId: s.cursorSessionId })));
}

function testSessionLookupAfterMapping() {
  console.log('\n🧪 TEST 3: Session Lookup After Mapping');
  console.log('---------------------------------------');
  
  // Simulate what happens when sending a second message
  const session1Id = 'session-1703123456789-abc123';
  const session2Id = 'session-1703123456790-def456';
  
  const session1 = mockSessions.find(s => s.id === session1Id);
  const session2 = mockSessions.find(s => s.id === session2Id);
  
  console.log('Session 1 lookup:', session1 ? { id: session1.id, cursorSessionId: session1.cursorSessionId } : 'Not found');
  console.log('Session 2 lookup:', session2 ? { id: session2.id, cursorSessionId: session2.cursorSessionId } : 'Not found');
  
  // Test what sessionIdToUse would be for second messages
  const session1IdToUse = session1 && session1.cursorSessionId ? session1.cursorSessionId : undefined;
  const session2IdToUse = session2 && session2.cursorSessionId ? session2.cursorSessionId : undefined;
  
  console.log(`Session 1 - sessionIdToUse for runCursor: ${session1IdToUse}`);
  console.log(`Session 2 - sessionIdToUse for runCursor: ${session2IdToUse}`);
  
  // Verify expectations
  const session1Correct = session1IdToUse === 'a655af1f-adb8-4211-8220-a8bd5c09d5fe';
  const session2Correct = session2IdToUse === '0b21192b-6aaa-4ecf-90fa-9ee0dd2be31d';
  
  console.log(`\n📊 Results:`);
  console.log(`Session 1 mapping: ${session1Correct ? '✅ PASS' : '❌ FAIL'} (expected: a655af1f-adb8-4211-8220-a8bd5c09d5fe, got: ${session1IdToUse})`);
  console.log(`Session 2 mapping: ${session2Correct ? '✅ PASS' : '❌ FAIL'} (expected: 0b21192b-6aaa-4ecf-90fa-9ee0dd2be31d, got: ${session2IdToUse})`);
  
  return session1Correct && session2Correct;
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting Session Mapping Tests...\n');
  
  try {
    await testSession1Mapping();
    await testSession2Mapping();
    const success = testSessionLookupAfterMapping();
    
    console.log('\n=====================================');
    if (success) {
      console.log('🎉 ALL TESTS PASSED! Session mapping is working correctly.');
    } else {
      console.log('💥 TESTS FAILED! Session mapping has issues.');
    }
    console.log('=====================================');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
  }
}

// Run tests
runAllTests();
