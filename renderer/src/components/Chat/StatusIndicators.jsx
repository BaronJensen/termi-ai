import React from 'react';

export default function StatusIndicators({ busy }) {
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
      <button
        onClick={() => {
          const text = '🤔 Thinking... Processing your request with cursor-agent...';
          navigator.clipboard.writeText(text);
        }}
        className="copy-button"
        title="Copy status message"
        aria-label="Copy status message"
      >
        Copy
      </button>
    </div>
  );
}
