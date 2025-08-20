import React from 'react';
import { marked } from 'marked';

export default function StreamingTextDisplay({ streamingText, className = '' }) {
  streamingText = 'Generating response...'
  if (!streamingText || !streamingText.trim().length > 0) {
    return null;
  }

  return (
    <div 
      className={`streaming-text-display ${className}`}
      style={{
        padding: '16px 20px',
        margin: '12px 0',
        color: '#d1d5db',
        fontSize: '13px',
        fontFamily: 'monospace',
        opacity: 0.6,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        paddingLeft: '20px',
        borderRadius: '8px',
        background: 'transparent',
        border: 'none',
        boxShadow: 'none',
      }}
    >
      <div style={{ 
        marginBottom: '8px', 
        fontSize: '11px', 
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        color: '#60a5fa',
        animation: 'textBlink 1.5s ease-in-out infinite'
      }}>
        🔄 Generating response...
      </div>
      <div 
        dangerouslySetInnerHTML={{
          __html: marked.parse(streamingText, {
            breaks: true,
            gfm: true,
            headerIds: false,
            mangle: false,
            sanitize: false,
            smartLists: true,
            smartypants: true,
            xhtml: false,
            highlight: null,
            langPrefix: 'language-',
            pedantic: false,
            renderer: new marked.Renderer()
          })
        }}
        style={{ 
          userSelect: 'text', 
          cursor: 'text',
          color: '#e5e7eb',
          opacity: 0.6,
          animation: 'contentBlink 2.5s ease-in-out infinite'
        }}
        className="markdown-content"
      />
    </div>
  );
}
