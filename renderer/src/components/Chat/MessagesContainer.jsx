import React, { useEffect, useCallback, useRef } from 'react';
import MessageList from './MessageList';
import ToolCallIndicator from './ToolCallIndicator';
import ScrollToBottomButton from './ScrollToBottomButton';

export default function MessagesContainer({ 
  scroller,
  filteredMessages, 
  toolCalls, 
  searchQuery, 
  cwd, 
  hideToolCallIndicators,
  streamingText,
  currentSessionId,
  projectId,
  isMiniGameOpen,
  showSessionList
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

  // Enhanced auto-scroll function
  const scrollToBottom = useCallback((behavior = 'smooth', delay = 100) => {
    if (scroller && scroller.current) {
      setTimeout(() => {
        if (scroller.current) {
          scroller.current.scrollTo({
            top: scroller.current.scrollHeight,
            behavior: behavior
          });
        }
      }, delay);
    }
  }, [scroller]);

  // Scroll to bottom on initial project view load
  useEffect(() => {
    if (scroller?.current && currentSessionId && filteredMessages.length > 0) {
      console.log(`📜 Initial load: Scrolling to bottom for project view`);
      scrollToBottom('smooth', 300);
    }
  }, [currentSessionId, filteredMessages.length, scrollToBottom]);

  // Scroll to bottom when project changes (new project loaded)
  useEffect(() => {
    if (scroller?.current && projectId) {
      console.log(`📜 New project loaded: ${projectId}, scrolling to bottom`);
      scrollToBottom('smooth', 800);
    }
  }, [projectId, scrollToBottom]);

  // Scroll to bottom when working directory changes
  useEffect(() => {
    if (scroller?.current && cwd) {
      console.log(`📜 Working directory changed: ${cwd}, scrolling to bottom`);
      scrollToBottom('smooth', 400);
    }
  }, [cwd, scrollToBottom]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scroller?.current && filteredMessages.length > 0) {
      console.log(`📜 Scrolling to bottom for new messages in session: ${currentSessionId}`);
      scrollToBottom('smooth', 50);
    }
  }, [filteredMessages, currentSessionId, scrollToBottom]);

  // Scroll to bottom when session changes (new session loaded)
  useEffect(() => {
    if (scroller?.current && currentSessionId) {
      console.log(`📜 Scrolling to bottom for new session: ${currentSessionId}`);
      scrollToBottom('smooth', 100);
    }
  }, [currentSessionId, scrollToBottom]);

  // Scroll to bottom when session list visibility changes
  useEffect(() => {
    if (scroller?.current && !showSessionList) {
      console.log(`📜 Scrolling to bottom after session list hidden`);
      scrollToBottom('smooth', 100);
    }
  }, [showSessionList, scrollToBottom]);

  // Scroll to bottom when search is cleared
  useEffect(() => {
    if (scroller?.current && !searchQuery) {
      console.log(`📜 Scrolling to bottom after search cleared`);
      scrollToBottom('smooth', 100);
    }
  }, [searchQuery, scrollToBottom]);

  // Scroll to bottom when mini-game closes
  useEffect(() => {
    if (scroller?.current && !isMiniGameOpen) {
      console.log(`📜 Scrolling to bottom after mini-game closed`);
      scrollToBottom('smooth', 200);
    }
  }, [isMiniGameOpen, scrollToBottom]);

  // Scroll to bottom when streaming text updates
  useEffect(() => {
    if (scroller?.current && streamingText && streamingText.length > 0) {
      console.log(`📜 Scrolling to bottom for streaming text updates`);
      scrollToBottom('smooth', 50);
    }
  }, [streamingText, scrollToBottom]);

  // Scroll to bottom when tool calls update
  useEffect(() => {
    if (scroller?.current && toolCalls && toolCalls.size > 0) {
      console.log(`📜 Scrolling to bottom for tool call updates`);
      scrollToBottom('smooth', 100);
    }
  }, [toolCalls, scrollToBottom]);
  
  return (
    <div className="messages-container">
      <MessageList 
        messages={filteredMessages} 
        toolCalls={toolCalls} 
        searchQuery={searchQuery} 
        cwd={cwd || ''} 
        streamingText={streamingText}
        scroller={scroller}
      />
      
      {/* Tool calls are now displayed as messages in the chat flow */}
      {/* Removed separate tool call indicators to avoid duplication */}
      
      {/* Floating scroll to bottom button */}
      <ScrollToBottomButton 
        scroller={scroller}
        onScrollToBottom={() => scrollToBottom('smooth', 0)}
      />
    </div>
  );
}
