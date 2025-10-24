import React from 'react';
import Bubble from './Bubble';
import StreamingTextDisplay from './StreamingTextDisplay';

export default function MessageList({ 
  messages, 
  toolCalls, 
  searchQuery, 
  cwd, 
  streamingText,
  scroller 
}) {
  // Find the last user message index to place streaming text after it
  const lastUserMessageIndex = messages.map((msg, index) => ({ msg, index }))
    .filter(({ msg }) => msg.who === 'user')
    .pop()?.index ?? -1;

  // If no user messages, show streaming text at the end
  const shouldShowStreamingText = streamingText && streamingText.trim().length > 0;
  const showStreamingTextAtEnd = shouldShowStreamingText && lastUserMessageIndex === -1;

  return (
    <div className="message-list" ref={scroller}>
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
        <>
          {messages.map((m, i) => (
            <React.Fragment key={i}>
              <Bubble
                who={m.who}
                isStreaming={m.isStreaming}
                rawData={m.rawData}
                showActionLog={m.showActionLog}
                toolCalls={m.showActionLog ? toolCalls : null}
                searchQuery={searchQuery}
                cwd={cwd || ''}
                streamingText={streamingText}
                messageType={m.isResult ? 'result' : m.isToolCall ? 'tool' : m.isStreaming ? 'streaming' : m.who}
                isToolCall={m.isToolCall}
                toolCallData={m.toolCallData}
                toolCallSubtype={m.toolCallSubtype}
                isReasoning={m.isReasoning}
                isFileEdit={m.isFileEdit}
              >
                {m.text}
              </Bubble>
              
              {/* Show streaming text below the last user message */}
              {i === lastUserMessageIndex && shouldShowStreamingText && (
                <StreamingTextDisplay streamingText={streamingText} />
              )}
            </React.Fragment>
          ))}
          
          {/* Show streaming text at the end if no user messages */}
          {showStreamingTextAtEnd && (
            <StreamingTextDisplay streamingText={streamingText} />
          )}
        </>
      )}
    </div>
  );
}


