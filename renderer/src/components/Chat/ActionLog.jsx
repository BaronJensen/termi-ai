import React from 'react';

export default function ActionLog({ toolCalls, isVisible = false, onToggle, isExpanded = false }) {
  if (!isVisible) return null;
  
  const completedCount = Array.from(toolCalls.values()).filter((t) => t.isCompleted).length;
  const totalCount = toolCalls.size;
  
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
        {Array.from(toolCalls.entries()).map(([callId, toolCallInfo]) => {
          const toolName = toolCallInfo.toolCall
            ? Object.keys(toolCallInfo.toolCall)
                .find((key) => key !== 'args' && key !== 'result')
                ?.replace(/ToolCall$/, '')
                .replace(/^[a-z]/, (char) => char.toUpperCase()) || 'Unknown'
            : 'Unknown';
          
          const path = toolCallInfo.toolCall
            ? toolCallInfo.toolCall[
                Object.keys(toolCallInfo.toolCall).find((key) => key !== 'args' && key !== 'result')
              ]?.args?.path ||
              toolCallInfo.toolCall[
                Object.keys(toolCallInfo.toolCall).find((key) => key !== 'args' && key !== 'result')
              ]?.args?.pattern ||
              ''
            : '';
          
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
              <span style={{ color: '#3c6df0', fontWeight: '500', minWidth: '60px' }}>{toolName}</span>
              {path && (
                <>
                  <span style={{ color: '#64748b' }}>-</span>
                  <span style={{ color: '#cbd5e1', fontSize: '10px' }}>{path}</span>
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
        
        {toolCalls.size === 0 && (
          <div
            style={{
              textAlign: 'center',
              color: '#64748b',
              fontStyle: 'italic',
              padding: '16px',
            }}
          >
            No actions performed during this conversation
          </div>
        )}
      </div>
    </div>
  );
}


