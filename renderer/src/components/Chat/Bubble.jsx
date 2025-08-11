import React, { useState } from 'react';
import { marked } from 'marked';
import ActionLog from './ActionLog';

export default function Bubble({
  who,
  children,
  isStreaming = false,
  rawData = null,
  showActionLog = false,
  toolCalls = null,
  searchQuery = '',
}) {
  const [isActionLogExpanded, setIsActionLogExpanded] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const highlightText = (text, query) => {
    if (!query || !text) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark
          key={index}
          style={{
            backgroundColor: '#fbbf24',
            color: '#000',
            padding: '0 2px',
            borderRadius: '2px',
            fontWeight: 'bold',
          }}
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const handleCopy = async (text) => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } else {
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
      alert('Failed to copy text to clipboard');
    }
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    return false;
  };

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
      const selection = window.getSelection();
      if (selection.toString()) {
        e.preventDefault();
        navigator.clipboard.writeText(selection.toString());
      }
    }
  };

  const content = isStreaming ? (
    <span className="streaming-text">{children}</span>
  ) : (
    <div
      dangerouslySetInnerHTML={{
        __html: marked.parse(children || '', {
          breaks: true,
          gfm: true,
          headerIds: false,
          mangle: false,
        }),
      }}
      style={{ userSelect: 'text', cursor: 'text', lineHeight: '1.6', fontSize: '14px' }}
      className="markdown-content"
    />
  );

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
        position: 'relative',
      }}
      onContextMenu={handleContextMenu}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
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
          zIndex: 10,
        }}
        onMouseEnter={(e) => !copySuccess && (e.target.style.opacity = 1)}
        onMouseLeave={(e) => !copySuccess && (e.target.style.opacity = 0)}
        aria-label={copySuccess ? 'Message copied to clipboard' : 'Copy message to clipboard'}
      >
        {copySuccess ? '✓' : 'Copy'}
      </button>

      {/* Removed raw JSON hover overlay */}

      {content}

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


