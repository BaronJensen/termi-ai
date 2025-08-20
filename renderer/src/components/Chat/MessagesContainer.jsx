import React from 'react';
import MessageList from './MessageList';
import ToolCallIndicator from './ToolCallIndicator';

export default function MessagesContainer({ 
  scroller,
  filteredMessages, 
  toolCalls, 
  searchQuery, 
  cwd, 
  hideToolCallIndicators,
  streamingText
}) {
  // Debug logging to help track down toolCalls issues
  if (toolCalls && !(toolCalls instanceof Map)) {
    console.warn('MessagesContainer received non-Map toolCalls:', {
      toolCalls,
      type: typeof toolCalls,
      constructor: toolCalls?.constructor?.name,
      isMap: toolCalls instanceof Map
    });
  }
  
  return (
    <div className="messages" ref={scroller}>
      <MessageList 
        messages={filteredMessages} 
        toolCalls={toolCalls} 
        searchQuery={searchQuery} 
        cwd={cwd || ''} 
        streamingText={streamingText}
      />

      {/* Tool Call Indicators - Only show while conversation is active */}
      {!hideToolCallIndicators && toolCalls && toolCalls instanceof Map && Array.from(toolCalls.entries()).map(([callId, toolCallInfo], index) => {
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
              cwd={cwd || ''}
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
    </div>
  );
}
