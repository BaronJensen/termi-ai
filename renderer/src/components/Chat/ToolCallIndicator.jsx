import React from 'react';

export default function ToolCallIndicator({ toolCall, isCompleted = false, rawData = null, animationDelay = 0 }) {
  if (!toolCall) return null;

  const getToolName = (toolCallData) => {
    if (!toolCallData) return 'Unknown';
    const keys = Object.keys(toolCallData);
    for (const key of keys) {
      if (key !== 'args' && key !== 'result') {
        return key.replace(/ToolCall$/, '').replace(/^[a-z]/, (char) => char.toUpperCase());
      }
    }
    return 'Unknown';
  };

  const getPath = (toolCallData, toolName) => {
    if (!toolCallData || !toolName) return null;
    const key = toolName.toLowerCase() + 'ToolCall';
    const path = toolCallData?.[key]?.args?.path;
    const pattern = toolCallData?.[key]?.args?.pattern;
    if (!path && !pattern) return null;
    return `${path || ''}${pattern ? (path ? ' ' : '') + pattern : ''}`.trim();
  };

  const toolName = getToolName(toolCall);
  const path = getPath(toolCall, toolName);

  return (
    <div
      className="tool-call-indicator"
      style={{ position: 'relative', '--animation-delay': `${animationDelay}s` }}
    >
      {isCompleted ? <div className="tool-call-check">✓</div> : <div className="tool-call-spinner"></div>}
      <span style={{ color: '#3c6df0', fontWeight: '500' }}>{toolName}</span>
      {path && (
        <>
          <span style={{ color: '#6b7280' }}>-</span>
          <span style={{ color: '#e5e7eb' }}>{path}</span>
        </>
      )}
      <span style={{ color: isCompleted ? '#4ade80' : '#fbbf24', fontSize: '10px', marginLeft: 'auto' }}>
        {isCompleted ? 'Completed' : 'Running...'}
      </span>

      {rawData && (
        <div
          style={{
            position: 'absolute',
            top: '8px',
            right: '40px',
            background: 'rgba(0, 0, 0, 0.9)',
            color: '#e6e6e6',
            border: '1px solid #3c6df0',
            borderRadius: '4px',
            padding: '8px',
            fontSize: '10px',
            fontFamily: 'monospace',
            maxWidth: '300px',
            maxHeight: '200px',
            overflow: 'auto',
            opacity: 0,
            transition: 'opacity 0.2s ease',
            zIndex: 20,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}
          onMouseEnter={(e) => (e.target.style.opacity = 1)}
          onMouseLeave={(e) => (e.target.style.opacity = 0)}
          title="Raw JSON data"
        >
          <div style={{ color: '#3c6df0', fontWeight: 'bold', marginBottom: '4px' }}>Raw JSON:</div>
          {JSON.stringify(rawData, null, 2)}
        </div>
      )}

      <button
        onClick={() => {
          const toolInfo = `Tool: ${toolName}${path ? ` - ${path}` : ''} | Status: ${isCompleted ? 'Completed' : 'Running...'}`;
          navigator.clipboard.writeText(toolInfo);
        }}
        className="copy-button"
        title="Copy tool call info"
      >
        Copy
      </button>
    </div>
  );
}


