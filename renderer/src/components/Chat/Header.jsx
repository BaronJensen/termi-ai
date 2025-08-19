import React, { useState } from 'react';

export default function Header({
  sessionName,
  showSearch,
  onToggleSearch,
  showSessionList,
  onToggleSessionList,
  showSessionTerminals,
  onToggleSessionTerminals,
  onNewSession,
  // Add new props for session information
  currentSession,
  allSessions
}) {
  const [showSessionInfo, setShowSessionInfo] = useState(false);

  return (
    <>
      <div style={{
        padding: '8px 12px',
        margin: '8px 0',
        backgroundColor: '#0b1018',
        borderRadius: '8px',
        fontSize: '12px',
        border: '1px solid #1d2633',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        color: '#e6e6e6',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: '500', color: '#3c6df0' }}>
            💬 {sessionName || 'No Session'}
          </span>
          <button
            onClick={() => setShowSessionInfo(!showSessionInfo)}
            style={{
              fontSize: '10px',
              padding: '2px 6px',
              backgroundColor: showSessionInfo ? '#7c3aed' : '#374151',
              color: '#e6e6e6',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              marginLeft: '8px'
            }}
            title="Show session details"
          >
            {showSessionInfo ? '📋' : 'ℹ️'}
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={onToggleSearch}
            style={{
              fontSize: '11px',
              padding: '4px 8px',
              backgroundColor: showSearch ? '#3c6df0' : '#374151',
              color: '#e6e6e6',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
            title="Search messages"
          >
            🔍
          </button>
          <button
            onClick={onToggleSessionList}
            style={{
              fontSize: '11px',
              padding: '4px 8px',
              backgroundColor: showSessionList ? '#3c6df0' : '#374151',
              color: '#e6e6e6',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
            title="Session history"
          >
            📚
          </button>

          <button
            onClick={onNewSession}
            style={{
              fontSize: '11px',
              padding: '4px 8px',
              backgroundColor: '#10b981',
              color: '#e6e6e6',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
            title="New session"
          >
            ➕
          </button>
        </div>
      </div>

      {/* Session Information Panel */}
      {showSessionInfo && (
        <div style={{
          padding: '12px',
          margin: '8px 0',
          backgroundColor: '#0f1419',
          borderRadius: '8px',
          fontSize: '11px',
          border: '1px solid #1d2633',
          color: '#e6e6e6',
          maxHeight: '400px',
          overflow: 'auto'
        }}>
          <div style={{ marginBottom: '12px', borderBottom: '1px solid #1d2633', paddingBottom: '8px' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#3c6df0', fontSize: '13px' }}>
              📊 Session Information Panel
            </h4>
            <p style={{ margin: '0', color: '#9ca3af', fontSize: '10px' }}>
              Detailed view of current session and all sessions state
            </p>
          </div>

          {/* Current Session Details */}
          {currentSession && (
            <div style={{ marginBottom: '16px' }}>
              <h5 style={{ margin: '0 0 8px 0', color: '#10b981', fontSize: '12px' }}>
                🎯 Current Session
              </h5>
              <div style={{
                backgroundColor: '#1a1f2e',
                padding: '8px',
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontSize: '10px',
                overflow: 'auto',
                maxHeight: '200px'
              }}>
                <pre style={{ margin: 0, color: '#e6e6e6' }}>
                  {JSON.stringify(currentSession, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* All Sessions Summary */}
          {allSessions && allSessions.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <h5 style={{ margin: '0 0 8px 0', color: '#f59e0b', fontSize: '12px' }}>
                📚 All Sessions ({allSessions.length})
              </h5>
              <div style={{
                backgroundColor: '#1a1f2e',
                padding: '8px',
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontSize: '10px',
                overflow: 'auto',
                maxHeight: '200px'
              }}>
                <pre style={{ margin: 0, color: '#e6e6e6' }}>
                  {JSON.stringify(allSessions.map(s => ({
                    id: s.id,
                    name: s.name,
                    cursorSessionId: s.cursorSessionId,
                    createdAt: s.createdAt,
                    updatedAt: s.updatedAt,
                    messageCount: s.messages?.length || 0
                  })), null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Session State Debug */}
          <div style={{ marginBottom: '16px' }}>
            <h5 style={{ margin: '0 0 8px 0', color: '#ef4444', fontSize: '12px' }}>
              🐛 Debug Information
            </h5>
            <div style={{
              backgroundColor: '#1a1f2e',
              padding: '8px',
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: '10px',
              overflow: 'auto',
              maxHeight: '150px'
            }}>
              <pre style={{ margin: 0, color: '#e6e6e6' }}>
                {JSON.stringify({
                  timestamp: new Date().toISOString(),
                  currentSessionId: currentSession?.id,
                  hasCursorSessionId: !!currentSession?.cursorSessionId,
                  cursorSessionId: currentSession?.cursorSessionId,
                  totalSessions: allSessions?.length || 0,
                  sessionsWithCursorId: allSessions?.filter(s => s.cursorSessionId).length || 0
                }, null, 2)}
              </pre>
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                if (window.cursovableLogRouter) {
                  window.cursovableLogRouter.debugState();
                }
              }}
              style={{
                fontSize: '10px',
                padding: '4px 8px',
                backgroundColor: '#059669',
                color: '#d1fae5',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              🔧 Debug Router
            </button>
            <button
              onClick={() => {
                if (window.cursovableLogRouter) {
                  window.cursovableLogRouter.debugSessions();
                }
              }}
              style={{
                fontSize: '10px',
                padding: '4px 8px',
                backgroundColor: '#7c3aed',
                color: '#e9d5ff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              🔧 Debug Sessions
            </button>
            <button
              onClick={() => {
                console.log('Current session:', currentSession);
                console.log('All sessions:', allSessions);
              }}
              style={{
                fontSize: '10px',
                padding: '4px 8px',
                backgroundColor: '#dc2626',
                color: '#fecaca',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              📝 Log to Console
            </button>
          </div>
        </div>
      )}
    </>
  );
}


