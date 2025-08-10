
import React, { useEffect, useRef, useState } from 'react';
import { marked } from 'marked';

function Bubble({ who, children, isStreaming = false, rawData = null, showActionLog = false, toolCalls = null, searchQuery = '' }) {
  const [isActionLogExpanded, setIsActionLogExpanded] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  
  // Highlight search query in text if provided
  const highlightText = (text, query) => {
    if (!query || !text) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} style={{
          backgroundColor: '#fbbf24',
          color: '#000',
          padding: '0 2px',
          borderRadius: '2px',
          fontWeight: 'bold'
        }}>
          {part}
        </mark>
      ) : part
    );
  };
  
  const handleCopy = async (text) => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy text: ', err);
      // Show error feedback
      alert('Failed to copy text to clipboard');
    }
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    // Allow default context menu for text selection
    return false;
  };

  const handleKeyDown = (e) => {
    // Handle Ctrl+C for copying selected text
    if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
      const selection = window.getSelection();
      if (selection.toString()) {
        e.preventDefault();
        navigator.clipboard.writeText(selection.toString());
      }
    }
  };

  return (
    <div 
      className={`bubble ${who}`} 
      style={{ 
        fontSize: '14px', 
        lineHeight: '1.5',
        wordWrap: 'break-word',
        overflowWrap: 'break-word',
        maxWidth: '100%',
        height: 'auto',
        minHeight: 'fit-content',
        position: 'relative'
      }}
      onContextMenu={handleContextMenu}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Copy button */}
      <button
        onClick={() => handleCopy(children)}
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          background: copySuccess ? '#10b981' : 'rgba(60, 109, 240, 0.8)',
          color: '#e6e6e6',
          border: 'none',
          borderRadius: '4px',
          padding: '4px 8px',
          fontSize: '10px',
          cursor: 'pointer',
          opacity: copySuccess ? 1 : 0,
          transition: 'all 0.2s ease',
          zIndex: 10
        }}
        onMouseEnter={(e) => !copySuccess && (e.target.style.opacity = 1)}
        onMouseLeave={(e) => !copySuccess && (e.target.style.opacity = 0)}
        title={copySuccess ? "Copied!" : "Copy message"}
        aria-label={copySuccess ? "Message copied to clipboard" : "Copy message to clipboard"}
      >
        {copySuccess ? '✓' : 'Copy'}
      </button>
      
      {/* Raw JSON tooltip for assistant messages */}
      {rawData && who === 'assistant' && (
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
            wordBreak: 'break-all'
          }}
          onMouseEnter={(e) => e.target.style.opacity = 1}
          onMouseLeave={(e) => e.target.style.opacity = 0}
          title="Raw JSON data"
        >
          <div style={{ color: '#3c6df0', fontWeight: 'bold', marginBottom: '4px' }}>Raw JSON:</div>
          {JSON.stringify(rawData, null, 2)}
        </div>
      )}
      
      {isStreaming ? (
        <span className="streaming-text">{children}</span>
      ) : (
        <div 
          dangerouslySetInnerHTML={{ __html: marked.parse(children || '', {
            breaks: true,
            gfm: true,
            headerIds: false,
            mangle: false
          }) }}
          style={{ 
            userSelect: 'text', 
            cursor: 'text',
            lineHeight: '1.6',
            fontSize: '14px'
          }}
          className="markdown-content"
        />
      )}
      
      {/* Action Log - only show for assistant messages that have the flag */}
      {showActionLog && toolCalls && (
        <ActionLog 
          toolCalls={toolCalls}
          isVisible={true}
          onToggle={() => setIsActionLogExpanded(!isActionLogExpanded)}
          isExpanded={isActionLogExpanded}
        />
      )}
    </div>
  );
}

// Action Log Component - Shows all tool calls and actions in a collapsible section
function ActionLog({ toolCalls, isVisible = false, onToggle, isExpanded = false }) {
  if (!isVisible) return null;
  
  const completedCount = Array.from(toolCalls.values()).filter(t => t.isCompleted).length;
  const totalCount = toolCalls.size;
  
  return (
    <div className="action-log" style={{
      margin: '8px 0',
      padding: '12px',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      border: '1px solid #334155',
      borderRadius: '8px',
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#e2e8f0',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
      animation: 'fadeInUp 0.3s ease-out'
    }}>
      <div className="action-log-header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: isExpanded ? '12px' : '0',
        cursor: 'pointer',
        userSelect: 'none',
        transition: 'all 0.2s ease'
      }} onClick={onToggle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ 
            background: '#3c6df0', 
            color: 'white', 
            borderRadius: '50%', 
            width: '16px', 
            height: '16px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            fontSize: '10px',
            fontWeight: 'bold'
          }}>
            {totalCount}
          </span>
          <span style={{ fontWeight: '500', color: '#3c6df0' }}>Action Log</span>
          <span style={{ color: '#64748b', fontSize: '11px' }}>
            ({completedCount}/{totalCount} completed)
          </span>
        </div>
        <span style={{ 
          color: '#64748b', 
          fontSize: '14px',
          transition: 'transform 0.2s ease',
          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
        }}>
          ▼
        </span>
      </div>
      
      <div className="action-log-content" style={{
        maxHeight: isExpanded ? '300px' : '0',
        overflow: 'hidden',
        borderTop: isExpanded ? '1px solid #334155' : 'none',
        paddingTop: isExpanded ? '12px' : '0',
        transition: 'all 0.3s ease',
        animation: isExpanded ? 'slideDown 0.3s ease-out' : 'none'
      }}>
        {Array.from(toolCalls.entries()).map(([callId, toolCallInfo], index) => {
          const toolName = toolCallInfo.toolCall ? 
            Object.keys(toolCallInfo.toolCall).find(key => key !== 'args' && key !== 'result')?.replace(/ToolCall$/, '').replace(/^[a-z]/, char => char.toUpperCase()) || 'Unknown' : 'Unknown';
          
          const path = toolCallInfo.toolCall ? 
            (toolCallInfo.toolCall[Object.keys(toolCallInfo.toolCall).find(key => key !== 'args' && key !== 'result')]?.args?.path || 
             toolCallInfo.toolCall[Object.keys(toolCallInfo.toolCall).find(key => key !== 'args' && key !== 'result')]?.args?.pattern || '') : '';
          
          const status = toolCallInfo.isCompleted ? 'completed' : 'running';
          const statusColor = toolCallInfo.isCompleted ? '#10b981' : '#f59e0b';
          const statusIcon = toolCallInfo.isCompleted ? '✓' : '⚡';
          
          return (
            <div key={callId} className="action-log-item" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 8px',
              margin: '4px 0',
              background: 'rgba(15, 23, 42, 0.6)',
              borderRadius: '4px',
              border: `1px solid ${statusColor}40`,
              fontSize: '11px'
            }}>
              <span style={{ 
                color: statusColor, 
                fontSize: '10px',
                fontWeight: 'bold'
              }}>
                {statusIcon}
              </span>
              <span style={{ color: '#3c6df0', fontWeight: '500', minWidth: '60px' }}>
                {toolName}
              </span>
              {path && (
                <>
                  <span style={{ color: '#64748b' }}>-</span>
                  <span style={{ color: '#cbd5e1', fontSize: '10px' }}>{path}</span>
                </>
              )}
              <span style={{ 
                color: statusColor, 
                fontSize: '10px',
                marginLeft: 'auto',
                fontWeight: '500'
              }}>
                {status}
              </span>
            </div>
          );
        })}
        
        {toolCalls.size === 0 && (
          <div style={{ 
            textAlign: 'center', 
            color: '#64748b', 
            fontStyle: 'italic',
            padding: '16px'
          }}>
            No actions performed during this conversation
          </div>
        )}
      </div>
    </div>
  );
}

// Tool Call Indicator Component
function ToolCallIndicator({ toolCall, isCompleted = false, rawData = null, animationDelay = 0 }) {
  console.log('ToolCallIndicator render:', { toolCall, isCompleted, rawData });
  
  // Safety check - if no tool call data, don't render
  if (!toolCall) {
    console.warn('ToolCallIndicator: No tool call data provided');
    return null;
  }
  
  const getToolName = (toolCallData) => {
    if (!toolCallData) return 'Unknown';
    
    // Find the first key that's not 'args' or 'result'
    const keys = Object.keys(toolCallData);
    for (const key of keys) {
      if (key !== 'args' && key !== 'result') {
        // Remove "ToolCall" suffix and capitalize
        return key.replace(/ToolCall$/, '').replace(/^[a-z]/, (char) => char.toUpperCase());
      }
    }
    return 'Unknown';
  };

  const getPath = (toolCallData, toolName) => {
    if (!toolCallData || !toolName) return null;
    
    const key = toolName.toLowerCase() + "ToolCall";
    console.log(">>>>",toolCallData, key, toolCallData?.[key]?.args?.path, toolCallData?.[key]?.args?.pattern);

    // Check if we have path or pattern, return whichever is available
    const path = toolCallData?.[key]?.args?.path;
    const pattern = toolCallData?.[key]?.args?.pattern;
    
    if (!path && !pattern) return null;
    
    // Return path with optional pattern
    return `${path || ''}${pattern ? (path ? ' ' : '') + pattern : ''}`.trim();
  };

  const toolName = getToolName(toolCall);
  const path = getPath(toolCall, toolName);
  
  console.log('Extracted tool name and path:', { toolName, path });

  return (
    <div 
      className="tool-call-indicator" 
      style={{ 
        position: 'relative',
        '--animation-delay': `${animationDelay}s`
      }}
    >
      {isCompleted ? (
        <div className="tool-call-check">
          ✓
        </div>
      ) : (
        <div className="tool-call-spinner"></div>
      )}
      <span style={{ color: '#3c6df0', fontWeight: '500' }}>
        {toolName}
      </span>
      {path && (
        <>
          <span style={{ color: '#6b7280' }}>-</span>
          <span style={{ color: '#e5e7eb' }}>{path}</span>
        </>
      )}
      <span style={{ 
        color: isCompleted ? '#4ade80' : '#fbbf24',
        fontSize: '10px',
        marginLeft: 'auto'
      }}>
        {isCompleted ? 'Completed' : 'Running...'}
      </span>
      
      {/* Raw JSON tooltip for tool calls */}
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
            wordBreak: 'break-all'
          }}
          onMouseEnter={(e) => e.target.style.opacity = 1}
          onMouseLeave={(e) => e.target.style.opacity = 0}
          title="Raw JSON data"
        >
          <div style={{ color: '#3c6df0', fontWeight: 'bold', marginBottom: '4px' }}>Raw JSON:</div>
          {JSON.stringify(rawData, null, 2)}
        </div>
      )}
      
      {/* Copy button for tool call info */}
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

export default function Chat({ apiKey, cwd, timeoutMinutes = 15 }) {
  // Add CSS animations and styles
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      @keyframes typewriter {
        from { 
          opacity: 0.8;
          transform: translateY(2px);
        }
        to { 
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      @keyframes slideInFromRight {
        from {
          opacity: 0;
          transform: translateX(100px) scale(0.8);
        }
        to {
          opacity: 1;
          transform: translateX(0) scale(1);
        }
      }
      
      @keyframes slideOutToLeft {
        from {
          opacity: 1;
          transform: translateX(0) scale(1);
        }
        to {
          opacity: 0;
          transform: translateX(-100px) scale(0.8);
        }
      }
      
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(20px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      
      @keyframes pulse {
        0%, 100% {
          transform: scale(1);
          opacity: 1;
        }
        50% {
          transform: scale(1.05);
          opacity: 0.8;
        }
      }
      
      @keyframes bounce {
        0%, 20%, 53%, 80%, 100% {
          transform: translate3d(0,0,0);
        }
        40%, 43% {
          transform: translate3d(0,-8px,0);
        }
        70% {
          transform: translate3d(0,-4px,0);
        }
        90% {
          transform: translate3d(0,-2px,0);
        }
      }
      
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(20px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      
      @keyframes slideDown {
        from {
          opacity: 0;
          max-height: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          max-height: 300px;
          transform: translateY(0);
        }
      }
      
      .streaming-text {
        display: inline-block;
        white-space: pre-wrap;
        word-wrap: break-word;
        max-width: 100%;
        height: auto;
        min-height: fit-content;
        animation: typewriter 0.15s ease-out;
        transition: all 0.1s ease;
      }
      
      .bubble {
        max-width: 100%;
        word-wrap: break-word;
        overflow-wrap: break-word;
        white-space: pre-wrap;
        padding: 12px 16px;
        margin: 8px 0;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        transition: all 0.2s ease;
        min-height: fit-content;
        height: auto;
      }
      
      .bubble.assistant {
        background: linear-gradient(135deg, #0b1018 0%, #1a2331 100%);
        border-left: 4px solid #3c6df0;
        margin-right: 20px;
        color: #e6e6e6;
      }
      
      .bubble.user {
        background: linear-gradient(135deg, #172033 0%, #2d3d57 100%);
        color: #e6e6e6;
        margin-left: 20px;
        text-align: right;
      }
      
      .bubble:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      }
      
      .messages {
        flex: 1;
        overflow-y: auto;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        height: auto;
        min-height: 0;
      }
      
      .input textarea {
        flex: 1;
        resize: vertical;
        min-height: 64px;
        max-height: 200px;
        background: #0b0f16;
        border: 1px solid #27354a;
        color: #d6dee8;
        padding: 10px;
        border-radius: 10px;
        outline: none;
        font-family: inherit;
        line-height: 1.4;
      }
      
      /* Global copy functionality */
      .copyable-text {
        user-select: text;
        cursor: text;
        -webkit-user-select: text;
        -moz-user-select: text;
        -ms-user-select: text;
      }
      
      .copyable-text:hover {
        background-color: rgba(60, 109, 240, 0.1);
        border-radius: 2px;
        padding: 1px 2px;
        margin: -1px -2px;
      }
      
      .copy-button {
        position: absolute;
        top: 8px;
        right: 8px;
        background: rgba(60, 109, 240, 0.8);
        color: #e6e6e6;
        border: none;
        borderRadius: '4px';
        padding: '4px 8px';
        fontSize: '10px';
        cursor: pointer;
        opacity: 0;
        transition: opacity 0.2s ease;
        zIndex: 10;
      }
      
      .copy-button:hover {
        opacity: 1;
      }
      
      .copyable-container {
        position: relative;
      }
      
      .copyable-container:hover .copy-button {
        opacity: 1;
      }
      
      /* Accessibility improvements */
      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }
      
      /* Focus styles for better accessibility */
      .bubble:focus,
      .input textarea:focus,
      button:focus {
        outline: 2px solid #3c6df0;
        outline-offset: 2px;
      }
      
      /* High contrast mode support */
      @media (prefers-contrast: high) {
        .bubble {
          border: 2px solid currentColor;
        }
        
        .copy-button {
          background: #000;
          color: #fff;
          border: 1px solid currentColor;
        }
      }
      
      /* Reduced motion support */
      @media (prefers-reduced-motion: reduce) {
        .streaming-text,
        .bubble,
        .copy-button {
          animation: none;
          transition: none;
        }
      }
      
      /* Markdown content styles */
      .markdown-content {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.6;
        color: #e6e6e6;
      }
      
      .markdown-content h1,
      .markdown-content h2,
      .markdown-content h3,
      .markdown-content h4,
      .markdown-content h5,
      .markdown-content h6 {
        margin: 16px 0 8px 0;
        color: #3c6df0;
        font-weight: 600;
        line-height: 1.3;
      }
      
      .markdown-content h1 { font-size: 1.5em; border-bottom: 2px solid #3c6df0; padding-bottom: 4px; }
      .markdown-content h2 { font-size: 1.3em; border-bottom: 1px solid #3c6df0; padding-bottom: 2px; }
      .markdown-content h3 { font-size: 1.1em; }
      .markdown-content h4 { font-size: 1em; }
      .markdown-content h5 { font-size: 0.9em; }
      .markdown-content h6 { font-size: 0.8em; }
      
      .markdown-content p {
        margin: 8px 0;
        line-height: 1.6;
      }
      
      .markdown-content ul,
      .markdown-content ol {
        margin: 8px 0;
        padding-left: 24px;
      }
      
      .markdown-content li {
        margin: 4px 0;
        line-height: 1.5;
      }
      
      .markdown-content blockquote {
        margin: 12px 0;
        padding: 8px 16px;
        border-left: 4px solid #3c6df0;
        background: rgba(60, 109, 240, 0.1);
        border-radius: 4px;
        font-style: italic;
        color: #c9d5e1;
      }
      
      .markdown-content strong,
      .markdown-content b {
        color: #ffffff;
        font-weight: 600;
      }
      
      .markdown-content em,
      .markdown-content i {
        color: #c9d5e1;
        font-style: italic;
      }
      
      .markdown-content code {
        background: rgba(15, 23, 42, 0.8);
        color: #fbbf24;
        padding: 2px 6px;
        border-radius: 4px;
        font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
        font-size: 0.9em;
        border: 1px solid #374151;
      }
      
      .markdown-content pre {
        background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
        border: 1px solid #334155;
        border-radius: 8px;
        padding: 16px;
        margin: 16px 0;
        overflow-x: auto;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        position: relative;
      }
      
      .markdown-content pre code {
        background: transparent;
        color: #e2e8f0;
        padding: 0;
        border: none;
        font-size: 0.9em;
        line-height: 1.5;
        display: block;
        white-space: pre;
        overflow-x: auto;
      }
      
      .markdown-content pre::before {
        content: '📄';
        position: absolute;
        top: 8px;
        right: 12px;
        font-size: 12px;
        opacity: 0.6;
        color: #64748b;
      }
      
      .markdown-content table {
        border-collapse: collapse;
        width: 100%;
        margin: 16px 0;
        background: rgba(15, 23, 42, 0.6);
        border-radius: 8px;
        overflow: hidden;
        border: 1px solid #334155;
      }
      
      .markdown-content th,
      .markdown-content td {
        padding: 8px 12px;
        text-align: left;
        border-bottom: 1px solid #334155;
      }
      
      .markdown-content th {
        background: rgba(60, 109, 240, 0.2);
        color: #3c6df0;
        font-weight: 600;
        font-size: 0.9em;
      }
      
      .markdown-content td {
        color: #e2e8f0;
        font-size: 0.9em;
      }
      
      .markdown-content tr:hover {
        background: rgba(60, 109, 240, 0.05);
      }
      
      .markdown-content a {
        color: #60a5fa;
        text-decoration: none;
        border-bottom: 1px solid transparent;
        transition: border-color 0.2s ease;
      }
      
      .markdown-content a:hover {
        border-bottom-color: #60a5fa;
        color: #93c5fd;
      }
      
      .markdown-content hr {
        border: none;
        height: 1px;
        background: linear-gradient(90deg, transparent, #3c6df0, transparent);
        margin: 24px 0;
      }
      
      .markdown-content .highlight {
        background: rgba(251, 191, 36, 0.1);
        border: 1px solid rgba(251, 191, 36, 0.3);
        border-radius: 4px;
        padding: 2px 4px;
        color: #fbbf24;
      }
      
      /* Tool call indicator styles */
      .tool-call-indicator {
        margin: 8px 0;
        padding: 8px 12px;
        background: linear-gradient(135deg, #0b1018 0%, #1a2331 100%);
        border: 1px solid #1d2633;
        border-radius: 8px;
        font-family: monospace;
        font-size: 12px;
        color: #e6e6e6;
        display: flex;
        align-items: center;
        gap: 12px;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        z-index: 1;
        animation: slideInFromRight 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        animation-delay: var(--animation-delay, 0s);
        transform-origin: center;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        backdrop-filter: blur(10px);
      }
      
      .tool-call-indicator:hover {
        border-color: #3c6df0;
        box-shadow: 0 8px 25px rgba(60, 109, 240, 0.3);
        transform: translateY(-3px) scale(1.03);
        background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      }
      
      .tool-call-spinner {
        width: 16px;
        height: 16px;
        border: 2px solid #3c6df0;
        border-top: 2px solid transparent;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        flex-shrink: 0;
        filter: drop-shadow(0 0 4px rgba(60, 109, 240, 0.5));
      }
      
      .tool-call-check {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
        font-size: 10px;
        font-weight: bold;
        flex-shrink: 0;
        animation: bounce 0.6s ease-out, fadeInUp 0.4s ease-out;
        box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
      }
      
      .tool-call-indicator .copy-button {
        position: absolute;
        top: 8px;
        right: 8px;
        background: linear-gradient(135deg, rgba(60, 109, 240, 0.8) 0%, rgba(59, 130, 246, 0.8) 100%);
        color: #e6e6e6;
        border: none;
        border-radius: 4px;
        padding: 4px 8px;
        font-size: 10px;
        cursor: pointer;
        opacity: 0;
        transition: all 0.2s ease;
        z-index: 10;
        transform: scale(0.9);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }
      
      .tool-call-indicator:hover .copy-button {
        opacity: 1;
        transform: scale(1);
      }
      
      .tool-call-indicator .copy-button:hover {
        background: linear-gradient(135deg, rgba(60, 109, 240, 1) 0%, rgba(59, 130, 246, 1) 100%);
        transform: scale(1.1);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  
  // Load messages from localStorage on mount
  useEffect(() => {
    try {
      const savedMessages = localStorage.getItem('cursovable-chat-messages');
      if (savedMessages) {
        const parsed = JSON.parse(savedMessages);
        if (Array.isArray(parsed)) {
          setMessages(parsed);
        }
      }
    } catch (error) {
      console.warn('Failed to load messages from localStorage:', error);
    }
  }, []);
  
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [terminalStatus, setTerminalStatus] = useState(null);
  const [toolCalls, setToolCalls] = useState(new Map()); // Track tool calls by call_id
  const [hideToolCallIndicators, setHideToolCallIndicators] = useState(false); // Hide tool call cards after result
  const [searchQuery, setSearchQuery] = useState(''); // New: search functionality
  const [showSearch, setShowSearch] = useState(false); // New: toggle search visibility
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0); // Track current search result
  const scroller = useRef(null);
  const unsubRef = useRef(null);
  const streamIndexRef = useRef(-1);
  const runIdRef = useRef(null);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('cursovable-chat-messages', JSON.stringify(messages));
    } catch (error) {
      console.warn('Failed to save messages to localStorage:', error);
    }
  }, [messages]);

  // Check terminal status on mount and when busy changes
  useEffect(() => {
    checkTerminalStatus();
  }, [busy]);
  
  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (scroller.current && messages.length > 0) {
      const shouldScroll = scroller.current.scrollTop + scroller.current.clientHeight >= scroller.current.scrollHeight - 100;
      if (shouldScroll) {
        setTimeout(() => {
          if (scroller.current) {
            scroller.current.scrollTop = scroller.current.scrollHeight;
          }
        }, 100);
      }
    }
  }, [messages]);

  // Reset textarea height when input changes
  useEffect(() => {
    const textarea = document.querySelector('.input textarea');
    if (textarea && !input) {
      textarea.style.height = '64px';
    }
  }, [input]);
  
  // Filter messages based on search query
  const filteredMessages = messages.filter(m => {
    if (!searchQuery.trim()) return true;
    return m.text.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Navigate to next/previous search result
  const navigateSearch = (direction) => {
    if (!searchQuery || filteredMessages.length === 0) return;
    
    const newIndex = direction === 'next' 
      ? (currentSearchIndex + 1) % filteredMessages.length
      : (currentSearchIndex - 1 + filteredMessages.length) % filteredMessages.length;
    
    setCurrentSearchIndex(newIndex);
    
    // Scroll to the message
    setTimeout(() => {
      const messageElements = document.querySelectorAll('.bubble');
      if (messageElements[newIndex]) {
        messageElements[newIndex].scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
        // Highlight the message briefly
        messageElements[newIndex].style.boxShadow = '0 0 0 2px #fbbf24';
        setTimeout(() => {
          messageElements[newIndex].style.boxShadow = '';
        }, 2000);
      }
    }, 100);
  };

  // Keyboard shortcuts for search navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showSearch && searchQuery && filteredMessages.length > 0) {
        if (e.key === 'Enter' && e.shiftKey) {
          e.preventDefault();
          navigateSearch('prev');
        } else if (e.key === 'Enter' && e.ctrlKey) {
          e.preventDefault();
          navigateSearch('next');
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showSearch, searchQuery, filteredMessages.length]);

  // Export conversation to JSON
  const exportConversation = () => {
    try {
      const dataStr = JSON.stringify(messages, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `cursovable-conversation-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export conversation:', error);
      alert('Failed to export conversation');
    }
  };

  // Clear conversation
  const clearConversation = () => {
    if (confirm('Are you sure you want to clear all messages? This action cannot be undone.')) {
      setMessages([]);
      setToolCalls(new Map());
      setHideToolCallIndicators(false);
    }
  };

  async function checkTerminalStatus() {
    try {
      const status = await window.cursovable.getTerminalStatus();
      setTerminalStatus(status);
      
      // Add status message if there are issues
      if (status.status === 'error' || status.status === 'idle') {
        setMessages(m => [...m, { 
          who: 'assistant', 
          text: `**Terminal Status:** ${status.status} - ${status.message || 'No message'}`, 
          rawData: { terminalStatus: status }
        }]);
      }
    } catch (err) {
      setTerminalStatus({ error: err.message });
      
      // Add error message
      setMessages(m => [...m, { 
        who: 'assistant', 
        text: `**Terminal Status Error:** ${err.message}`, 
        rawData: { error: err.message }
      }]);
    }
  }

  async function forceCleanup() {
    try {
      const result = await window.cursovable.forceTerminalCleanup();
      await checkTerminalStatus();
      setMessages(m => [...m, { who: 'assistant', text: `**Cleanup completed:** ${result.message}. Cleaned ${result.processesCleaned} processes.`, rawData: { cleanup: result } }]);
    } catch (err) {
      setMessages(m => [...m, { who: 'assistant', text: `**Cleanup failed:** ${err.message}`, rawData: { error: err.message } }]);
    }
  }

  // Force reset streaming state if something goes wrong
  function forceResetStreamingState() {
    if (unsubRef.current) { 
      try { unsubRef.current(); } catch {} 
      unsubRef.current = null; 
    }
    streamIndexRef.current = -1;
    runIdRef.current = null;
    setBusy(false);
    
    // Reset tool call indicator visibility
    setHideToolCallIndicators(false);
    
    // Clear tool calls with animations if any exist
    if (toolCalls.size > 0) {
      clearAllToolCallsWithAnimation();
    }
    
    // Add a message to inform the user
    setMessages(m => [...m, { 
      who: 'assistant', 
      text: '**Streaming state reset:** Cleared all active streams and tool calls.', 
      rawData: { action: 'reset_streaming_state' }
    }]);
  }

  // Clear all tool calls manually
  function clearToolCalls() {
    setToolCalls(new Map());
    setMessages(m => [...m, { 
      who: 'assistant', 
      text: '**Tool calls cleared:** All tool call indicators have been removed.', 
      rawData: { action: 'clear_tool_calls' }
    }]);
  }

  // Keep all tool calls permanently - no auto-cleanup
  // The action log will show the complete history

  // Enhanced cleanup function that clears all tool calls
  function clearAllToolCallsWithAnimation() {
    if (toolCalls.size === 0) return;
    
    setToolCalls(new Map());
    
    // Add a message to inform the user
    setMessages(m => [...m, { 
      who: 'assistant', 
      text: '**All tool calls cleared:** All tool call indicators have been removed.', 
      rawData: { action: 'clear_all_tool_calls' }
    }]);
  }

  // Clear only completed tool calls
  function clearCompletedToolCallsWithAnimation() {
    const completedCallIds = Array.from(toolCalls.entries())
      .filter(([_, toolCallInfo]) => toolCallInfo.isCompleted)
      .map(([callId, _]) => callId);
    
    if (completedCallIds.length === 0) return;
    
    setToolCalls(current => {
      const updated = new Map(current);
      completedCallIds.forEach(callId => updated.delete(callId));
      return updated;
    });
    
    // Add a message to inform the user
    setMessages(m => [...m, { 
      who: 'assistant', 
      text: `**Completed tools cleared:** ${completedCallIds.length} completed tool call indicators have been removed.`, 
      rawData: { action: 'clear_completed_tool_calls', count: completedCallIds.length }
    }]);
  }

  // Force cleanup all tool calls immediately (no animations, for debugging)
  function forceClearAllToolCalls() {
    if (toolCalls.size === 0) return;
    
    setToolCalls(new Map());
    
    // Add a message to inform the user
    setMessages(m => [...m, { 
      who: 'assistant', 
      text: `**Force cleared:** All ${toolCalls.size} tool call indicators have been immediately removed.`, 
      rawData: { action: 'force_clear_all_tool_calls', count: toolCalls.size }
    }]);
  }

  useEffect(() => {
    (async () => {
      const hist = await window.cursovable.getHistory();
      const display = [];
      for (const item of hist) {
        if (item.type === 'result') {
          display.push({ who: 'user', text: item.prompt || item.message || '(message not stored)' });
          display.push({ who: 'assistant', text: item.result || JSON.stringify(item), rawData: item });
        } else if (item.type === 'raw') {
          display.push({ who: 'assistant', text: '```\n' + item.output + '\n```', rawData: item });
        }
      }
      setMessages(display);
    })();
  }, []);

  useEffect(() => {
    if (scroller.current) {
      scroller.current.scrollTop = scroller.current.scrollHeight;
    }
  }, [messages, busy]);

  async function send() {
    const text = input.trim();
    if (!text) return;
    
    // Check if working directory is selected
    if (!cwd) {
      alert('Please select a working directory first using the "Change" button above.');
      return;
    }
    
    // Check if already busy
    if (busy) {
      console.warn('Already processing a request, ignoring new input');
      return;
    }
    
    setInput('');
    // Reset textarea height
    const textarea = document.querySelector('.input textarea');
    if (textarea) {
      textarea.style.height = '64px';
    }
    
    // Reset tool call indicator visibility for new conversation
    setHideToolCallIndicators(false);
    
    // Add user message
    setMessages(m => [...m, { who: 'user', text, rawData: { command: text, timestamp: Date.now() } }]);
    setBusy(true);
    
    try {
      // Prepare streaming message and subscribe to logs for this run
      const runId = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
      runIdRef.current = runId;
      
      // Create streaming assistant message
      let streamIdx;
      setMessages(m => {
        streamIdx = m.length;
        streamIndexRef.current = streamIdx;
        return [...m, { who: 'assistant', text: '', isStreaming: true, rawData: null }];
      });
      
      // Track accumulated assistant text
      let accumulatedText = '';
      
      // Subscribe to log stream for this run
      unsubRef.current = window.cursovable.onCursorLog(async (payload) => {
        if (!payload || payload.runId !== runIdRef.current) {
          return;
        }
        
        try {
          // Parse each line as JSON
          const lines = payload.line.split('\n').filter(line => line.trim());
          
          for (const line of lines) {
            try {
              const parsed = JSON.parse(line);
              console.log('Parsed log line:', parsed);
              
              // Handle assistant messages - accumulate text content
              if (parsed.type === 'assistant' && parsed.message && parsed.message.content) {
                for (const content of parsed.message.content) {
                  if (content.type === 'text' && content.text) {
                    accumulatedText += content.text;
                    
                    // Update the streaming message with accumulated text
                    setMessages(m => {
                      const idx = streamIndexRef.current;
                      if (idx >= 0 && idx < m.length) {
                        const updated = [...m];
                        updated[idx] = { ...updated[idx], text: accumulatedText, isStreaming: true };
                        return updated;
                      }
                      return m;
                    });
                    
                    // Add a small delay for more organic typing feel
                    await new Promise(resolve => setTimeout(resolve, 20));
                  }
                }
              }
              
              // Handle tool calls
              if (parsed.type === 'tool_call') {
                const callId = parsed.call_id;
                const toolCallData = parsed.tool_call;
                
                console.log('Tool call received:', { callId, subtype: parsed.subtype, toolCallData });
                
                // Store tool call info
                setToolCalls(prev => {
                  const newMap = new Map(prev);
                  const existing = newMap.get(callId);
                  
                  console.log('Storing tool call:', { callId, subtype: parsed.subtype, existing: !!existing });
                  
                  if (existing) {
                    // Update existing tool call
                    newMap.set(callId, {
                      ...existing,
                      toolCall: toolCallData, // Update with latest tool call data
                      isCompleted: parsed.subtype === 'completed',
                      isStarted: parsed.subtype === 'started',
                      completedAt: parsed.subtype === 'completed' ? Date.now() : existing.completedAt,
                      rawData: parsed, // Store the complete raw JSON
                      lastUpdated: Date.now() // Track when this was last updated
                    });
                  } else {
                    // Create new tool call entry
                    newMap.set(callId, {
                      toolCall: toolCallData,
                      isCompleted: parsed.subtype === 'completed',
                      isStarted: parsed.subtype === 'started',
                      startedAt: Date.now(),
                      completedAt: parsed.subtype === 'completed' ? Date.now() : null,
                      rawData: parsed, // Store the complete raw JSON
                      lastUpdated: Date.now() // Track when this was last updated
                    });
                  }
                  
                  console.log('Tool calls after update:', newMap.size);
                  return newMap;
                });
                
              }
              
              // Stop streaming when we get a result
              if (parsed.type === 'result') {
                // Mark all active tool calls as completed
                setToolCalls(prev => {
                  const newMap = new Map();
                  for (const [callId, toolCallInfo] of prev.entries()) {
                    newMap.set(callId, {
                      ...toolCallInfo,
                      isCompleted: true,
                      completedAt: Date.now(),
                      lastUpdated: Date.now()
                    });
                  }
                  return newMap;
                });
                  
                  // Hide tool call indicators after result
                  setHideToolCallIndicators(true);
                  
                  // Mark the streaming message as complete
                  if (accumulatedText.trim()) {
                    setMessages(m => {
                      const idx = streamIndexRef.current;
                      if (idx >= 0 && idx < m.length) {
                        const updated = [...m];
                        updated[idx] = { ...updated[idx], isStreaming: false };
                        return updated;
                      }
                      return m;
                    });
                    
                    // Create a new bubble with the final result message
                    setMessages(m => {
                      const newMessages = [...m, { 
                        who: 'assistant', 
                        text: `**Command completed successfully!**\n\n${accumulatedText}`,
                        isStreaming: false,
                        rawData: { result: 'success', text: accumulatedText },
                        showActionLog: true // Flag to show action log
                      }];
                      
                      // Scroll to the new message after a brief delay to ensure it's rendered
                      setTimeout(() => {
                        if (scroller.current) {
                          scroller.current.scrollTop = scroller.current.scrollHeight;
                        }
                      }, 100);
                      
                      return newMessages;
                    });
                  } else {
                    // If we didn't get any assistant content, show a fallback message
                    setMessages(m => {
                      const idx = streamIndexRef.current;
                      if (idx >= 0 && idx < m.length) {
                        const updated = [...m];
                        updated[idx] = { ...updated[idx], text: 'No response content received from cursor-agent.', isStreaming: false, rawData: { error: 'No response content' } };
                        return updated;
                      }
                      return m;
                    });
                  }
                  
                  // Clean up streaming state and allow new input
                  if (unsubRef.current) { 
                    try { unsubRef.current(); } catch {} 
                    unsubRef.current = null; 
                  }
                  streamIndexRef.current = -1;
                  runIdRef.current = null;
                  setBusy(false);
                  
                  return;
                }
            } catch (parseError) {
              // This line is not valid JSON - check if it's our end marker
              if (line.includes('123[*****END*****]123')) {
                // Mark all active tool calls as completed
                setToolCalls(prev => {
                  const newMap = new Map();
                  for (const [callId, toolCallInfo] of prev.entries()) {
                    newMap.set(callId, {
                      ...toolCallInfo,
                      isCompleted: true,
                      completedAt: Date.now(),
                      lastUpdated: Date.now()
                    });
                  }
                  return newMap;
                });
                
                // Hide tool call indicators after result
                setHideToolCallIndicators(true);
                
                // Mark the streaming message as complete
                if (accumulatedText.trim()) {
                  setMessages(m => {
                    const idx = streamIndexRef.current;
                    if (idx >= 0 && idx < m.length) {
                      const updated = [...m];
                      updated[idx] = { ...updated[idx], isStreaming: false };
                      return updated;
                    }
                    return m;
                  });
                  
                  // Create a new bubble with the final result message
                  setMessages(m => {
                    const newMessages = [...m, { 
                      who: 'assistant', 
                      text: `**Command completed successfully!**\n\n${accumulatedText}`,
                      isStreaming: false,
                      rawData: { result: 'success', text: accumulatedText },
                      showActionLog: true // Flag to show action log
                    }];
                    
                    // Scroll to the new message after a brief delay to ensure it's rendered
                    setTimeout(() => {
                      if (scroller.current) {
                        scroller.current.scrollTop = scroller.current.scrollHeight;
                      }
                    }, 100);
                    
                    return newMessages;
                  });
                } else {
                  // If we didn't get any assistant content, show a fallback message
                  setMessages(m => {
                    const idx = streamIndexRef.current;
                    if (idx >= 0 && idx < m.length) {
                      const updated = [...m];
                      updated[idx] = { ...updated[idx], text: 'No response content received from cursor-agent.', isStreaming: false, rawData: { error: 'No response content' } };
                      return updated;
                    }
                    return m;
                  });
                }
                
                // Clean up streaming state and allow new input
                if (unsubRef.current) { 
                  try { unsubRef.current(); } catch {} 
                  unsubRef.current = null; 
                }
                streamIndexRef.current = -1;
                runIdRef.current = null;
                setBusy(false);
                
                return;
              }
              
              // Skip other lines that aren't valid JSON
              continue;
            }
          }
        } catch (error) {
          console.error('Error processing log line:', error);
        }
      });

      const res = await window.cursovable.runCursor({ 
        message: text, 
        apiKey: apiKey || undefined, 
        cwd: cwd || undefined, 
        runId,
        timeoutMs: timeoutMinutes * 60 * 1000 // Convert minutes to milliseconds
      });
      
      // We just need to ensure the process completed successfully
      if (res.type === 'error') {
        throw new Error(res.error || 'Unknown error occurred');
      }
      
      // Log successful response for debugging
      console.log('runCursor completed successfully:', res);
      
      // Fallback: If we're still streaming after runCursor completes, assume it's done
      if (streamIndexRef.current >= 0 && accumulatedText.trim()) {
        // Mark all active tool calls as completed
        setToolCalls(prev => {
          const newMap = new Map();
          for (const [callId, toolCallInfo] of prev.entries()) {
            newMap.set(callId, {
              ...toolCallInfo,
              isCompleted: true,
              completedAt: Date.now(),
              lastUpdated: Date.now()
            });
          }
          return newMap;
        });
        
        // Hide tool call indicators after result
        setHideToolCallIndicators(true);
        
        // Mark streaming as complete
        setMessages(m => {
          const idx = streamIndexRef.current;
          if (idx >= 0 && idx < m.length) {
            const updated = [...m];
            updated[idx] = { ...updated[idx], isStreaming: false };
            return updated;
          }
          return m;
        });
        
        // Create completion message if we have content
        if (accumulatedText.trim()) {
          setMessages(m => [...m, { 
            who: 'assistant', 
            text: `**Command completed:**\n\n${accumulatedText}`,
            isStreaming: false,
            rawData: { result: 'completed', text: accumulatedText },
            showActionLog: true // Flag to show action log
          }]);
        }
        
        // Clean up streaming state and allow new input
        if (unsubRef.current) { 
          try { unsubRef.current(); } catch {} 
          unsubRef.current = null; 
        }
        streamIndexRef.current = -1;
        runIdRef.current = null;
        setBusy(false);
      }
    } catch (e) {
      // Check if it's a terminal-related error
      let errorMessage = e.message || String(e);
      if (errorMessage.includes('timeout') || errorMessage.includes('idle')) {
        errorMessage = `**Terminal timeout detected:** ${errorMessage}\n\nThis usually means the cursor-agent process hung or is waiting for input. Try:\n\n1. **Force Cleanup** button above to kill stuck processes\n2. Check if cursor-agent needs interactive input\n3. Restart the application if the issue persists`;
      } else if (errorMessage.includes('cursor-agent')) {
        errorMessage = `**Cursor agent error:** ${errorMessage}\n\nCheck if cursor-agent is properly installed and accessible.`;
      } else if (errorMessage.includes('SIGTERM') || errorMessage.includes('killed')) {
        errorMessage = `**Process terminated:** ${errorMessage}\n\nThis usually means the process was killed due to timeout or cleanup. This is normal behavior.`;
      }
      
      // Render error in the streaming bubble if available
      setMessages(m => {
        const idx = streamIndexRef.current;
        const text = errorMessage;
        if (idx >= 0 && idx < m.length) {
          const updated = [...m];
          updated[idx] = { who: 'assistant', text, isStreaming: false, rawData: { error: errorMessage } };
          return updated;
        }
        return [...m, { who: 'assistant', text, isStreaming: false, rawData: { error: errorMessage } }];
      });
      
      // Update terminal status after error
      await checkTerminalStatus();
    } finally {
      // Clean up streaming state
      if (unsubRef.current) { try { unsubRef.current(); } catch {} unsubRef.current = null; }
      streamIndexRef.current = -1;
      runIdRef.current = null;
      setBusy(false);
    }
  }

  return (
    <>

      
      {/* Search bar */}
      {showSearch && (
        <div className="search-container copyable-container" style={{
          padding: '8px 12px',
          margin: '8px 0',
          backgroundColor: '#0b1018',
          borderRadius: '4px',
          fontSize: '12px',
          fontFamily: 'monospace',
          border: '1px solid #1d2633',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#e6e6e6'
        }}>
          <span>🔍</span>
          <input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              background: '#1a2331',
              border: '1px solid #27354a',
              color: '#e6e6e6',
              padding: '4px 8px',
              borderRadius: '3px',
              fontSize: '12px',
              outline: 'none'
            }}
            aria-label="Search messages"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setCurrentSearchIndex(0);
              }}
              style={{
                fontSize: '10px',
                padding: '2px 6px',
                backgroundColor: '#6b7280',
                color: '#e6e6e6',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
          <span style={{ fontSize: '10px', opacity: 0.7 }}>
            {filteredMessages.length} / {messages.length} messages
          </span>
          {searchQuery && filteredMessages.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                onClick={() => navigateSearch('prev')}
                style={{
                  fontSize: '10px',
                  padding: '2px 6px',
                  backgroundColor: '#6b7280',
                  color: '#e6e6e6',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
                title="Previous result"
                aria-label="Go to previous search result"
              >
                ↑
              </button>
              <span style={{ fontSize: '10px', minWidth: '20px', textAlign: 'center' }}>
                {currentSearchIndex + 1}
              </span>
              <button
                onClick={() => navigateSearch('next')}
                style={{
                  fontSize: '10px',
                  padding: '2px 6px',
                  backgroundColor: '#6b7280',
                  color: '#e6e6e6',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
                title="Next result"
                aria-label="Go to next search result"
              >
                ↓
              </button>
            </div>
          )}
        </div>
      )}
      

      
      <div className="messages" ref={scroller}>
        {filteredMessages.length === 0 && searchQuery ? (
          <div style={{
            padding: '20px',
            textAlign: 'center',
            color: '#6b7280',
            fontSize: '14px'
          }}>
            🔍 No messages found matching "{searchQuery}"
          </div>
        ) : filteredMessages.length === 0 ? (
          <div style={{
            padding: '20px',
            textAlign: 'center',
            color: '#6b7280',
            fontSize: '14px'
          }}>
            💬 Start a conversation by typing a message below
          </div>
        ) : (
          filteredMessages.map((m, i) => (
                        <Bubble 
              key={i} 
              who={m.who} 
              isStreaming={m.isStreaming} 
              rawData={m.rawData}
              showActionLog={m.showActionLog}
              toolCalls={m.showActionLog ? toolCalls : null}
              searchQuery={searchQuery}
            >
              {m.text}
            </Bubble>
          ))
        )}
        
        {/* Tool Call Indicators - Only show while conversation is active */}
        {!hideToolCallIndicators && Array.from(toolCalls.entries()).map(([callId, toolCallInfo], index) => {
          // Only show tool calls that have actual tool call data
          if (!toolCallInfo.toolCall) return null;
          
          console.log('Rendering tool call:', { callId, toolCallInfo });
          
          try {
            return (
              <ToolCallIndicator 
                key={`tool-${callId}`}
                toolCall={toolCallInfo.toolCall}
                isCompleted={toolCallInfo.isCompleted}
                rawData={toolCallInfo.rawData}
                animationDelay={index * 0.1} // Stagger animations
              />
            );
          } catch (error) {
            console.error('Error rendering tool call indicator:', error, { callId, toolCallInfo });
            // Return a fallback indicator instead of crashing
            return (
              <div key={`tool-error-${callId}`} style={{
                padding: '8px 12px',
                margin: '8px 0',
                background: '#1f2937',
                border: '1px solid #ef4444',
                borderRadius: '8px',
                color: '#ef4444',
                fontSize: '12px',
                fontFamily: 'monospace'
              }}>
                ⚠️ Tool call error: {callId}
              </div>
            );
          }
        })}
        
        {/* Debug: Show tool call count - Only show while conversation is active */}
        {!hideToolCallIndicators && toolCalls.size > 0 && (
          <div style={{ 
            fontSize: '10px', 
            color: '#6b7280', 
            padding: '8px 12px',
            fontFamily: 'monospace',
            background: 'rgba(15, 23, 42, 0.8)',
            borderRadius: '8px',
            border: '1px solid #374151',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            animation: 'fadeInUp 0.3s ease-out',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
          }}>
            <span style={{ 
              background: '#3c6df0', 
              color: 'white', 
              borderRadius: '50%', 
              width: '18px', 
              height: '18px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontSize: '9px',
              fontWeight: 'bold',
              animation: toolCalls.size > 0 ? 'pulse 2s ease-in-out infinite' : 'none'
            }}>
              {toolCalls.size}
            </span>
            <span style={{ fontWeight: '500' }}>Active Tools</span>
            <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '8px' }}>✓</span>
              {Array.from(toolCalls.values()).filter(t => t.isCompleted).length}
            </span>
            <span style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '8px' }}>⚡</span>
              {Array.from(toolCalls.values()).filter(t => !t.isCompleted).length}
            </span>
          </div>
        )}
      </div>
      
      {/* Message counter and status */}
      <div style={{
        padding: '8px 12px',
        margin: '8px 0',
        backgroundColor: '#0b1018',
        borderRadius: '4px',
        fontSize: '11px',
        fontFamily: 'monospace',
        border: '1px solid #1d2633',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        color: '#6b7280'
      }}>
        <span>
          💬 {messages.length} message{messages.length !== 1 ? 's' : ''} 
          {searchQuery && ` • ${filteredMessages.length} filtered`}
        </span>
        <span>
          ⚡ {Array.from(toolCalls.values()).filter(t => !t.isCompleted).length} active tools
        </span>
      </div>
      
      {/* Status indicators at the bottom */}
      {busy && (
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
      )}
      
      <div className="input">
        <div style={{ position: 'relative', flex: 1 }}>
          <textarea
            placeholder={!cwd ? 'Please select a working directory first...' : `Ask the CTO agent… (timeout: ${timeoutMinutes === 0 ? 'no limit' : `${timeoutMinutes} min`})`}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              // Auto-resize textarea
              const textarea = e.target;
              textarea.style.height = 'auto';
              textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
            }}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') send();
              // Handle Ctrl+C for copying selected text
              if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
                const selection = e.target.value.substring(e.target.selectionStart, e.target.selectionEnd);
                if (selection) {
                  e.preventDefault();
                  navigator.clipboard.writeText(selection);
                }
              }
            }}
            disabled={!cwd}
            style={{ height: '64px' }}
            className="copyable-text"
            aria-label="Type your message to the CTO agent"
          />
          {/* Keyboard shortcut hint */}
          <div style={{
            position: 'absolute',
            bottom: '4px',
            right: '8px',
            fontSize: '10px',
            color: '#6b7280',
            pointerEvents: 'none',
            fontFamily: 'monospace'
          }}>
            {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+Enter
          </div>
        </div>
        <button 
          onClick={send} 
          disabled={busy || !cwd} 
          style={{ 
            opacity: !cwd ? 0.5 : 1,
            minWidth: '80px',
            height: '64px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}
          aria-label={!cwd ? 'Select working directory first' : busy ? 'Processing request...' : 'Send message'}
        >
          {!cwd ? 'Select Directory First' : busy ? '⏳' : 'Send'}
        </button>
      </div>
    </>
  );
}
