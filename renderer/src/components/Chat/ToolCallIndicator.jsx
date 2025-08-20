import React from 'react';

export default function ToolCallIndicator({ toolCall, isCompleted = false, rawData = null, animationDelay = 0, cwd = '' }) {
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
  const absoluteText = getPath(toolCall, toolName);

  const makeRelative = (input) => {
    if (!input) return '';
    if (!cwd) return input;
    const normalizedCwd = cwd.endsWith('/') ? cwd : `${cwd}/`;
    // Remove absolute cwd prefix wherever it appears
    let output = input.startsWith(normalizedCwd)
      ? input.slice(normalizedCwd.length)
      : input.replaceAll(normalizedCwd, '');
    // Also handle the case without trailing slash
    const noSlash = cwd.endsWith('/') ? cwd.slice(0, -1) : cwd;
    if (output.startsWith(noSlash + '/')) output = output.slice(noSlash.length + 1);
    return output;
  };

  const fullText = makeRelative(absoluteText);

  return (
    <div
      className="tool-call-indicator"
      style={{ position: 'relative', '--animation-delay': `${animationDelay}s` }}
    >
      {isCompleted ? <div className="tool-call-check">✓</div> : <div className="tool-call-spinner"></div>}
      <span style={{ color: '#3c6df0', fontWeight: '500' }}>{toolName}</span>
      {fullText && (
        <>
          <span style={{ color: '#6b7280' }}>-</span>
          <span
            className="path-text truncate-with-popover"
            style={{ color: '#e5e7eb' }}
            title={fullText}
            data-full={fullText}
          >
            {fullText}
          </span>
        </>
      )}
      <span style={{ color: isCompleted ? '#4ade80' : '#fbbf24', fontSize: '10px', marginLeft: 'auto' }}>
        {isCompleted ? 'Completed' : 'Running...'}
      </span>
    </div>
  );
}


