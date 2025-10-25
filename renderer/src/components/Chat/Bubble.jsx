import React, { useState } from 'react';
import { marked } from 'marked';
import ActionLog from './ActionLog';
import ToolCallIndicator from './ToolCallIndicator';

export default function Bubble({
  who,
  children,
  showActionLog = false,
  toolCalls = null,
  cwd = '',
  messageType = 'user',
  isToolCall = false,
  toolCallData = null,
  toolCallSubtype = null,
  isReasoning = false,
  isFileEdit = false
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

    // Handle reasoning messages (Codex agent thinking)
    if (isReasoning) {
      return {
        ...baseStyle,
        background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%)',
        color: '#c4b5fd',
        borderLeft: '3px solid #a855f7',
        fontStyle: 'italic',
        opacity: 0.9
      };
    }

    // Handle file edit messages
    if (isFileEdit) {
      return {
        ...baseStyle,
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(5, 150, 105, 0.08) 100%)',
        color: '#6ee7b7',
        borderLeft: '3px solid #10b981'
      };
    }

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

      case 'tool':
        return {
          ...baseStyle,
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)',
          color: '#e5e7eb',

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

  // Render tool call content using ToolCallIndicator
  const renderToolCallContent = () => {
    if (!isToolCall || !toolCallData) {
      return null;
    }
    
    const isCompleted = toolCallSubtype === 'completed' || toolCallSubtype === 'end' || toolCallSubtype === 'finished';
    
    return (
      <ToolCallIndicator
        toolCall={toolCallData}
        isCompleted={isCompleted}
        rawData={toolCallData}
        cwd={cwd}
      />
    );
  };

  // Render regular content for non-tool-call messages
  const renderRegularContent = () => {
    if (isToolCall) {
      return null;
    }
    
    return (
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
  };

  return (
    <div
      className={`bubble ${who}${isToolCall ? ' tool-call' : ''}`}
      style={getMessageStyle()}
      // Do not block the native context menu or key events here
      tabIndex={0}
    >
      {/* Render tool call content or regular content */}
      {renderToolCallContent()}
      {renderRegularContent()}

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


