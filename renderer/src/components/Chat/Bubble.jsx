import React, { useState } from 'react';
import { marked } from 'marked';
import ActionLog from './ActionLog';

export default function Bubble({
  who,
  children,
  showActionLog = false,
  toolCalls = null,
  cwd = '',
  messageType = 'user'
}) {
  const [isActionLogExpanded, setIsActionLogExpanded] = useState(false);
  // Define background colors for different message types
  const getMessageStyle = () => {
    const baseStyle = {
      fontSize: 12,
      wordWrap: 'break-word',
      overflowWrap: 'break-word',
      maxWidth: '100%',
      height: 'auto',
      minHeight: 'fit-content',
      position: 'relative',
      transition: 'all 0.3s ease',
      borderRadius: '12px',
      padding: '6px 16px',
      margin: '8px 0'
    };

    switch (messageType) {
      case 'user':
        return {
          ...baseStyle,
          background: 'transparent',
          color: '#f9fafb',
          padding: '6px 16px',
          border: '1px solid #4b5563'
        };
     
      case 'result':
        return {
          ...baseStyle,
          background: 'transparent',
          color: '#f0fdf4', 
          border: 'none'

        };

      default:
        return {
          ...baseStyle,
          background: 'transparent',
          color: '#f3f4f6',
          boxShadow: 'none',
          border: 'none'
        };
    }
  };

  const content = (
    <div
      dangerouslySetInnerHTML={{
        __html: marked.parse(children || '', {
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
        }),
      }}
      style={{ userSelect: 'text', cursor: 'text', lineHeight: 0.9, fontSize: 12 }}
      className={`markdown-content`}
    />
  );


  return (
    <div
      className={`bubble ${who}`}
      style={getMessageStyle()}
      // Do not block the native context menu or key events here
      tabIndex={0}
    >

      {/* Removed raw JSON hover overlay */}
      {content}

      {showActionLog && toolCalls && (
        <ActionLog
          toolCalls={toolCalls}
          isVisible={true}
          onToggle={() => setIsActionLogExpanded(!isActionLogExpanded)}
          isExpanded={isActionLogExpanded}
          cwd={cwd}
        />
      )}
    </div>
  );
}


