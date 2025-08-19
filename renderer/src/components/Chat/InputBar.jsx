import React from 'react';

export default function InputBar({
  value,
  onChange,
  onSubmit,
  disabled,
  model,
  setModel,
  suggestedModels
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
      </div>
    </div>
  );
}


