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
      
      {/* Tool calls are now displayed as messages in the chat flow */}
      {/* Removed separate tool call indicators to avoid duplication */}
    </div>
  );
}
