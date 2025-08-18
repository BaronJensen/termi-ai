import React from 'react';
import Bubble from './Bubble';

export default function MessageList({ messages, toolCalls, searchQuery, cwd }) {
  return (
    <div className="messages" ref={null}>
      {messages.length === 0 ? (
        <div style={{
          padding: '20px',
          textAlign: 'center',
          color: '#6b7280',
          fontSize: '14px'
        }}>
          💬 Start a conversation by typing a message below
        </div>
      ) : (
        messages.map((m, i) => (
          <Bubble 
            key={i}
            who={m.who}
            isStreaming={m.isStreaming}
            rawData={m.rawData}
            showActionLog={m.showActionLog}
            toolCalls={m.showActionLog ? toolCalls : null}
            searchQuery={searchQuery}
            cwd={cwd || ''}
          >
            {m.text}
          </Bubble>
        ))
      )}
    </div>
  );
}


