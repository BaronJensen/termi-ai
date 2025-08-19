// Copy-paste this into your browser console when the app is running
// This tests the actual session mapping functionality in your app

console.log('🧪 Testing Session Mapping in Running App');
console.log('==========================================');

// Test 1: Check if SessionProvider is available
console.log('\n🔍 Test 1: SessionProvider Availability');
console.log('SessionProvider available:', !!window.cursovableLogRouter);
console.log('SessionProvider object:', window.cursovableLogRouter);

if (window.cursovableLogRouter) {
    console.log('✅ SessionProvider is available');
    
    // Test 2: Check current session state
    console.log('\n🔍 Test 2: Current Session State');
    try {
        const debugState = window.cursovableLogRouter.debugState();
        console.log('Debug state:', debugState);
    } catch (error) {
        console.error('❌ Error getting debug state:', error);
    }
    
    try {
        const debugSessions = window.cursovableLogRouter.debugSessions();
        console.log('Debug sessions:', debugSessions);
    } catch (error) {
        console.error('❌ Error getting debug sessions:', error);
    }
    
    // Test 3: Check if handlers are registered
    console.log('\n🔍 Test 3: Registered Handlers');
    if (window.cursovableLogRouter.handlers) {
        console.log('Total handlers:', window.cursovableLogRouter.handlers.size);
        console.log('Registered runIds:', Array.from(window.cursovableLogRouter.handlers.keys()));
    } else {
        console.log('❌ No handlers map found');
    }
    
} else {
    console.log('❌ SessionProvider not available');
    console.log('This means the app is not properly initialized or there is an issue with the SessionProvider');
}

// Test 4: Simulate a cursor-agent response
console.log('\n🔍 Test 4: Simulating Cursor-Agent Response');
const mockResponse = {
    runId: 'test-run-' + Date.now(),
    level: 'json',
    line: JSON.stringify({
        "apiKeySource": "login",
        "cwd": "/Users/jensenbaronville/dev/projects/auto-cto",
        "model": "GPT-5",
        "permissionMode": "default",
        "session_id": "test-session-" + Date.now(),
        "subtype": "init",
        "type": "system"
    }),
    sessionId: 'temp-test-session',
    ts: Date.now()
};

console.log('Mock response:', mockResponse);

if (window.cursovableLogRouter) {
    console.log('Routing mock response through log router...');
    window.cursovableLogRouter.routeLog(mockResponse);
} else {
    console.log('❌ Cannot test routing - SessionProvider not available');
}

// Test 5: Check if we can access the Chat component's session state
console.log('\n🔍 Test 5: Chat Component Session State');
console.log('Looking for Chat component in React DevTools...');
console.log('You can also check the Session Information Panel in the chat header');

// Test 6: Manual session state inspection
console.log('\n🔍 Test 6: Manual Session State Inspection');
console.log('To manually inspect session state:');
console.log('1. Open the Session Information Panel in the chat header (click the ℹ️ button)');
console.log('2. Look for the "Debug Router" and "Debug Sessions" buttons');
console.log('3. Check the console for detailed session information');

console.log('\n==========================================');
console.log('🧪 Console Tests Complete');
console.log('Check the output above for any issues');
console.log('If SessionProvider is not available, the app has initialization problems');
