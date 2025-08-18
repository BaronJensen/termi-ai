import React from 'react';

export default function SessionList({
  showSessionList,
  sessions,
  currentSessionId,
  createNewSession,
  loadSession,
  deleteSession,
  setShowSessionList
}) {
  if (!showSessionList) return null;

  return (
    <div style={{
      padding: '12px',
      margin: '8px 0',
      backgroundColor: '#0b1018',
      borderRadius: '8px',
      border: '1px solid #1d2633',
      maxHeight: '300px',
      overflowY: 'auto'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
        paddingBottom: '8px',
        borderBottom: '1px solid #1d2633'
      }}>
        <h3 style={{ 
          margin: 0, 
          fontSize: '14px', 
          color: '#3c6df0',
          fontWeight: '600'
        }}>
          Session History
        </h3>
        <button
          onClick={() => createNewSession()}
          style={{
            fontSize: '12px',
            padding: '6px 12px',
            backgroundColor: '#10b981',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          + New Session
        </button>
      </div>
      
      {sessions.length === 0 ? (
        <div style={{
          textAlign: 'center',
          color: '#6b7280',
          fontSize: '12px',
          padding: '20px'
        }}>
          No sessions yet. Create your first session!
        </div>
      ) : (
        sessions
          .sort((a, b) => b.updatedAt - a.updatedAt)
          .map(session => (
            <div
              key={session.id}
              style={{
                padding: '8px 12px',
                margin: '4px 0',
                backgroundColor: session.id === currentSessionId ? '#1a2331' : '#111827',
                border: session.id === currentSessionId ? '1px solid #3c6df0' : '1px solid #374151',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                transition: 'all 0.2s ease'
              }}
              onClick={() => {
                if (session.id !== currentSessionId) {
                  loadSession(session.id);
                  setShowSessionList(false);
                }
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '12px',
                  color: session.id === currentSessionId ? '#3c6df0' : '#e6e6e6',
                  fontWeight: session.id === currentSessionId ? '600' : '400',
                  marginBottom: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  {session.name}
                </div>
                <div style={{
                  fontSize: '10px',
                  color: '#6b7280',
                  display: 'flex',
                  gap: '8px'
                }}>
                  <span>{(session.messages || []).length} messages</span>
                  <span>•</span>
                  <span>{new Date(session.updatedAt).toLocaleString()}</span>
                  {session.cursorSessionId && (
                    <>
                      <span>•</span>
                      <span style={{ color: '#10b981' }} title={`Linked to cursor-agent session: ${session.cursorSessionId}`}>🔗</span>
                    </>
                  )}
                </div>
              </div>
              
              {session.id === currentSessionId && (
                <span style={{
                  fontSize: '10px',
                  color: '#10b981',
                  fontWeight: '600',
                  marginRight: '8px'
                }}>
                  ACTIVE
                </span>
              )}
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Delete session "${session.name}"? This cannot be undone.`)) {
                    deleteSession(session.id);
                  }
                }}
                style={{
                  fontSize: '10px',
                  padding: '2px 6px',
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
                title="Delete session"
              >
                🗑️
              </button>
            </div>
          ))
      )}
    </div>
  );
}
