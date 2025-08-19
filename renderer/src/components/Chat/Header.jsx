import React from 'react';

export default function Header({
  sessionName,
  showSearch,
  onToggleSearch,
  showSessionList,
  onToggleSessionList,
  showSessionTerminals,
  onToggleSessionTerminals,
  onNewSession
}) {
  return (
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
  );
}


