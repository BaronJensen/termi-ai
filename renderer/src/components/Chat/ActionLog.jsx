import React from 'react';

export default function ActionLog({ toolCalls, isVisible = false, onToggle, isExpanded = false, cwd = '' }) {
  if (!isVisible) return null;
  console.log('toolCalls', toolCalls);

  const toPairs = (tc) => {
    if (!tc) return [];
    if (tc instanceof Map) return Array.from(tc.entries());
    if (Array.isArray(tc)) return tc.map((e) => [e.id, { ...e }]);
    return [];
  };

  const entries = toPairs(toolCalls).map(([callId, toolCallInfo]) => {
    const keys = toolCallInfo.toolCall ? Object.keys(toolCallInfo.toolCall) : [];
    const mainKey = keys.find((k) => k !== 'args' && k !== 'result');
    const toolName = mainKey
      ? mainKey.replace(/ToolCall$/, '').replace(/^[a-z]/, (c) => c.toUpperCase())
      : 'Unknown';
    return { callId, toolCallInfo, toolName, mainKey };
  });

  // Prefer showing edit-like tool calls; if none, show all so logs are never empty
  const filteredForEdit = entries.filter(({ mainKey, toolName }) => {
    if (!mainKey && !toolName) return false;
    const lowerKey = (mainKey || '').toLowerCase();
    const normalizedName = (toolName || '').toLowerCase();
    const haystack = `${lowerKey} ${normalizedName}`;
    console.log('haystack', haystack, haystack.includes('edit') || haystack.includes('read') || haystack.includes('readtoolcall')); 
    return (
      haystack.includes('edit') ||
      haystack.includes('apply_patch') ||
      haystack.includes('applypatch') ||
      haystack.includes('edit_file') ||
      haystack.includes('editfile') ||
      haystack.includes('read') ||
      haystack.includes('readtoolcall')
    );
  });
  const editEntries = filteredForEdit.length > 0 ? filteredForEdit : entries;

  const completedCount = editEntries.filter((e) => e.toolCallInfo.isCompleted).length;
  const totalCount = editEntries.length;

  const makeRelative = (input) => {
    if (!input) return '';
    if (!cwd) return input;
    const withSlash = cwd.endsWith('/') ? cwd : `${cwd}/`;
    let out = input.startsWith(withSlash) ? input.slice(withSlash.length) : input.replaceAll(withSlash, '');
    const noSlash = cwd.endsWith('/') ? cwd.slice(0, -1) : cwd;
    if (out.startsWith(noSlash + '/')) out = out.slice(noSlash.length + 1);
    return out;
  };

  const computeAbsolute = (input) => {
    if (!input) return '';
    // If already absolute (starts with / or drive letter), return as is
    if (/^(\w:)?\//i.test(input) || input.startsWith('/')) return input;
    if (!cwd) return input;
    const base = cwd.endsWith('/') ? cwd : `${cwd}/`;
    return base + input.replace(/^\.\/?/, '');
  };
  
  return (
    <div
      className="action-log"
      style={{
        margin: '8px 0',
        padding: '12px',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        border: '1px solid #334155',
        borderRadius: '8px',
        fontSize: '12px',
        fontFamily: 'monospace',
        color: '#e2e8f0',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
        animation: 'fadeInUp 0.3s ease-out',
      }}
    >
      <div
        className="action-log-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: isExpanded ? '12px' : '0',
          cursor: 'pointer',
          userSelect: 'none',
          transition: 'all 0.2s ease',
        }}
        onClick={onToggle}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              background: '#3c6df0',
              color: 'white',
              borderRadius: '50%',
              width: '16px',
              height: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              fontWeight: 'bold',
            }}
          >
            {totalCount}
          </span>
          <span style={{ fontWeight: '500', color: '#3c6df0' }}>Action Log</span>
          <span style={{ color: '#64748b', fontSize: '11px' }}>
            ({completedCount}/{totalCount} completed)
          </span>
        </div>
        <span
          style={{
            color: '#64748b',
            fontSize: '14px',
            transition: 'transform 0.2s ease',
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          ▼
        </span>
      </div>
      
      <div
        className="action-log-content"
        style={{
          maxHeight: isExpanded ? '300px' : '0',
          overflow: 'hidden',
          borderTop: isExpanded ? '1px solid #334155' : 'none',
          paddingTop: isExpanded ? '12px' : '0',
          transition: 'all 0.3s ease',
          animation: isExpanded ? 'slideDown 0.3s ease-out' : 'none',
        }}
      >
        {editEntries.map(({ callId, toolCallInfo, toolName, mainKey }) => {
          const args = mainKey ? toolCallInfo.toolCall?.[mainKey]?.args : null;
          const absPath = args?.path || args?.pattern || '';
          const relPath = makeRelative(absPath);
          const fullPath = computeAbsolute(relPath || absPath);

          const status = toolCallInfo.isCompleted ? 'completed' : 'running';
          const statusColor = toolCallInfo.isCompleted ? '#10b981' : '#f59e0b';
          const statusIcon = toolCallInfo.isCompleted ? '✓' : '⚡';

          return (
            <div
              key={callId}
              className="action-log-item"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 8px',
                margin: '4px 0',
                background: 'rgba(15, 23, 42, 0.6)',
                borderRadius: '4px',
                border: `1px solid ${statusColor}40`,
                fontSize: '11px',
              }}
            >
              <span
                style={{
                  color: statusColor,
                  fontSize: '10px',
                  fontWeight: 'bold',
                }}
              >
                {statusIcon}
              </span>
              <span style={{ color: '#3c6df0', fontWeight: '500', minWidth: '60px' }}>{toolName || 'Tool'}</span>
              {relPath && (
                <>
                  <span style={{ color: '#64748b' }}>-</span>
                  <span
                    className="truncate-with-popover"
                    style={{ color: '#cbd5e1', fontSize: '10px', cursor: 'pointer', textDecoration: 'underline dotted' }}
                    title={relPath}
                    data-full={relPath}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      try {
                        const { defaultEditor } = require('../../store/settings');
                      } catch {}
                      try {
                        const settings = JSON.parse(localStorage.getItem('termi-ai-settings') || '{}');
                        const editor = settings.defaultEditor || '';
                        if (editor) {
                          window.termiAI.openInEditor({ folderPath: cwd || '', editor, targetPath: fullPath });
                        } else {
                          window.termiAI.openFolder(fullPath);
                        }
                      } catch {
                        try { window.termiAI.openFolder(fullPath); } catch {}
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        try {
                          const settings = JSON.parse(localStorage.getItem('termi-ai-settings') || '{}');
                          const editor = settings.defaultEditor || '';
                          if (editor) {
                            window.termiAI.openInEditor({ folderPath: cwd || '', editor, targetPath: fullPath });
                          } else {
                            window.termiAI.openFolder(fullPath);
                          }
                        } catch {
                          try { window.termiAI.openFolder(fullPath); } catch {}
                        }
                      }
                    }}
                  >
                    {relPath}
                  </span>
                </>
              )}
              <span
                style={{
                  color: statusColor,
                  fontSize: '10px',
                  marginLeft: 'auto',
                  fontWeight: '500',
                }}
              >
                {status}
              </span>
            </div>
          );
        })}
        
        {totalCount === 0 && (
          <div
            style={{
              textAlign: 'center',
              color: '#64748b',
              fontStyle: 'italic',
              padding: '16px',
            }}
          >
            No edits performed during this conversation
          </div>
        )}
      </div>
    </div>
  );
}


