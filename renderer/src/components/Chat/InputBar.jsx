import React from 'react';

export default function InputBar({
  value,
  onChange,
  onSubmit,
  disabled,
  model,
  setModel,
  suggestedModels,
  isMiniGameOpen,
  onCloseMiniGame,
  isSessionBusy,
  gameTimeLeft
}) {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (value && value.trim()) {
      onSubmit(value);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value && value.trim()) {
        onSubmit(value);
      }
      return;
    }
  };

  // Show close game button when mini-game is open
  if (isMiniGameOpen) {
    // Blue button when busy (to return to work), Red button when not busy (to close game)
    const isUrgent = gameTimeLeft <= 5;
    const showBlueButton = isSessionBusy; // When busy, show blue "Let's go back to work"
    const showRedButton = !isSessionBusy;  // When not busy, show red "Close Game"

    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center',
        background: 'linear-gradient(135deg, #0b1018 0%, #1a2331 100%)',
        borderRadius: '12px',
        border: '1px solid #1d2633',
        margin: '16px 0'
      }}>
        <div style={{ 
          fontSize: '16px', 
          color: '#e6e6e6', 
          marginBottom: '16px',
          fontWeight: '500'
        }}>
          🎮 Mini-game is open in the preview area
        </div>
        
        {showBlueButton && (
          <button
            onClick={onCloseMiniGame}
            className="mini-game-button"
            style={{
              padding: '14px 24px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              margin: '0 auto'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 16px rgba(59,130,246,0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 12px rgba(59,130,246,0.3)';
            }}
          >
            <span style={{ fontSize: '18px' }}>🚀</span>
            Let's go back to work!
          </button>
        )}

        {showRedButton && (
          <button
            onClick={onCloseMiniGame}
            className="mini-game-button blink-button"
            style={{
              padding: '14px 24px',
              background: isUrgent 
                ? 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)'
                : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              transition: 'all 0.3s ease',
              boxShadow: isUrgent 
                ? '0 4px 12px rgba(220,38,38,0.5)'
                : '0 4px 12px rgba(239,68,68,0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              margin: '0 auto',
              animation: isUrgent ? 'blink-button 1s ease-in-out infinite' : 'blink-button 2s ease-in-out infinite'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = isUrgent 
                ? '0 6px 16px rgba(220,38,38,0.6)'
                : '0 6px 16px rgba(239,68,68,0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = isUrgent 
                ? '0 4px 12px rgba(220,38,38,0.5)'
                : '0 4px 12px rgba(239,68,68,0.3)';
            }}
          >
            <span style={{ fontSize: '16px' }}>⏰</span>
            <span style={{ 
              fontSize: '18px', 
              fontWeight: '700',
              color: isUrgent ? '#fef2f2' : 'white'
            }}>
              {gameTimeLeft}s
            </span>
          
            Close Game
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <form className="input" onSubmit={handleSubmit}>
        <div className="input-field" style={{ position: 'relative', width: '100%', display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'center' }}>
          <textarea
            placeholder={'What do you want to do?'}
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              const textarea = e.target;
              textarea.style.height = 'auto';
              textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
            }}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            style={{ height: '64px' }}
            className="copyable-text"
            aria-label="Type your message to the CTO agent"
          />
          <button 
            disabled={disabled || !value?.trim()}
            className="send-button"
            aria-label={disabled ? 'Processing request...' : 'Send message'}
            title={disabled ? 'Processing request...' : 'Send message'}
            type="submit"
          >
            {disabled ? '⏳' : '➤'}
          </button>
        </div>
      </form>
      
      {/* Model selector below input */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
        <select
          className="chip-select"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          aria-label="Select model"
          title={model === '' ? 'Using default model from settings' : `Selected model: ${model}`}
        >
          <option value="">Auto (default)</option>
          {suggestedModels.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <datalist id="cursor-models">
          {suggestedModels.map(m => (
            <option key={m} value={m} />
          ))}
        </datalist>
        {model === '' && (
          <div style={{ 
            fontSize: '11px', 
            color: '#9ca3af',
            fontStyle: 'italic',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <span>⚙️</span>
            Using default from settings
          </div>
        )}
        {model !== '' && (
          <div style={{ 
            fontSize: '11px', 
            color: '#6b7280',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <span>📝</span>
            Project override
          </div>
        )}
      </div>
    </div>
  );
}


