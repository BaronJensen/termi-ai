import React from 'react';

export default function StatusIndicators({ busy, onPlayMiniGame, isMiniGameOpen }) {
  if (!busy) return null;

  return (
    <div className="status-indicators copyable-container" style={{
      padding: '16px',
      margin: '12px 0',
      background: 'linear-gradient(135deg, #0b1018 0%, #1a2331 100%)',
      borderRadius: '12px',
      border: '1px solid #1d2633',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      fontSize: '14px',
      color: '#e6e6e6',
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      transition: 'all 0.3s ease'
    }}>
      <div className="spinner" style={{
        width: '20px',
        height: '20px',
        border: '3px solid #1a2331',
        borderTop: '3px solid #3c6df0',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }}></div>
      <div className="copyable-text" style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
        <span style={{ fontWeight: '500', color: '#3c6df0' }}>🤔 Thinking...</span>
        <span style={{ fontSize: '12px', opacity: 0.7, color: '#c9d5e1' }}>
          Processing your request with cursor-agent...
        </span>
      </div>
      
      {!isMiniGameOpen && (
        <button
          onClick={onPlayMiniGame}
          style={{
            padding: '8px 16px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '600',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 4px rgba(59,130,246,0.2)'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-1px)';
            e.target.style.boxShadow = '0 4px 8px rgba(59,130,246,0.3)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 2px 4px rgba(59,130,246,0.2)';
          }}
        >
          🎮 Play Mini-Game
        </button>
      )}
    </div>
  );
}
