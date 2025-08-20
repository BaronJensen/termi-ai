
import React, { useEffect, useRef, useState, useCallback } from 'react';
import Header from './Chat/Header';
import MessageList from './Chat/MessageList';
import InputBar from './Chat/InputBar';
import ToolCallIndicator from './Chat/ToolCallIndicator';
import SessionList from './Chat/SessionList';
import StatusIndicators from './Chat/StatusIndicators';
import SearchBar from './Chat/SearchBar';
import MessagesContainer from './Chat/MessagesContainer';
import { useChatSend } from './Chat/hooks/useChatSend';
import { useSession } from '../providers/SessionProvider.jsx';

import { styles } from './Chat/styles';

export default function Chat({ cwd, initialMessage, projectId, onPlayMiniGame, onCloseMiniGame, isMiniGameOpen, gameTimeLeft }) {
  // Add error boundary for initialization issues
  try {
    const sessionData = useSession();
    console.log('🔍 Full session data:', sessionData);
    
    const {
      sessions,
      currentSessionId,
      busyBySession,
      toolCallsBySession,
      hideToolCallIndicatorsBySession,
      streamingTextBySession,
      terminalLogs,
      createNewSession,
      loadSession,
      deleteSession,
      updateSessionWithCursorId,
      saveCurrentSession,
      markSessionRunningTerminal,
      setSessionBusy,
      setSessionToolCalls,
      setSessionHideToolCallIndicators,
      getCurrentSessionBusy,
      getCurrentSessionToolCalls,
      getCurrentSessionHideToolCallIndicators,
      getCurrentSessionStreamingText,
      deriveSessionNameFromMessage,
      send,
      clearSessionTerminalLogs,
      clearAllTerminalLogs,
      getTerminalLogStats,
      messageHandler
    } = sessionData;

    // Add CSS animations and styles
    useEffect(() => {
      const style = document.createElement('style');
      style.textContent = styles
      document.head.appendChild(style);
      
      return () => {
        document.head.removeChild(style);
      };
    }, []);

    // Debug terminal logs state
    useEffect(() => {
      console.log('🔍 Chat component terminal logs debug:');
      console.log('terminalLogs:', terminalLogs);
      console.log('getTerminalLogStats function:', getTerminalLogStats);
      console.log('clearSessionTerminalLogs function:', clearSessionTerminalLogs);
      console.log('clearAllTerminalLogs function:', clearAllTerminalLogs);
      console.log('currentSessionId:', currentSessionId);
      
      if (terminalLogs && typeof terminalLogs.get === 'function') {
        console.log('terminalLogs is a Map with size:', terminalLogs.size);
        console.log('terminalLogs entries:', Array.from(terminalLogs.entries()));
      } else {
        console.warn('terminalLogs is not a Map:', terminalLogs);
      }
    }, [terminalLogs, getTerminalLogStats, clearSessionTerminalLogs, clearAllTerminalLogs, currentSessionId]);

    
    
    // Get messages from the current session instead of local state
    const currentSession = sessions.find(s => s.id === currentSessionId);
    const messages = currentSession?.messages || [];
    
    const [input, setInput] = useState('');
    const [terminalStatus, setTerminalStatus] = useState(null);
    const [searchQuery, setSearchQuery] = useState(''); // New: search functionality
    const [showSearch, setShowSearch] = useState(false); // New: toggle search visibility
    const [currentSearchIndex, setCurrentSearchIndex] = useState(0); // Track current search result
    const [showSessionList, setShowSessionList] = useState(false); // Toggle session list UI
    const [isCreatingNewSession, setIsCreatingNewSession] = useState(false); // Creating new session state
    
    // Filter messages for search functionality (moved after state declarations)
    const filteredMessages = searchQuery 
      ? messages.filter(msg => 
          msg.text && msg.text.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : messages;

    // Model selection (empty string means default/auto; don't send to CLI)
    const modelStorageKey = `cursovable-model-${projectId || 'legacy'}`;
    const suggestedModels = [
      'gpt-5',
      'gpt-5-fast',
      'sonnet-4',
      'sonnet-4-thinking',
      'gpt-4.1',
      'gpt-4.1-mini'
    ];


    const [model, setModel] = useState(() => {
      try {
        const stored = localStorage.getItem(modelStorageKey);
        return stored !== null ? stored : '';
      } catch { return ''; }
    });
    // Persist model per project (must be after model is declared)
    useEffect(() => {
      try { localStorage.setItem(modelStorageKey, model); } catch {}
    }, [model, modelStorageKey]);
    const scroller = useRef(null);
    const unsubRef = useRef(null);
    
    // Enhanced auto-scroll function
    const scrollToBottom = useCallback((behavior = 'smooth', delay = 100) => {
      if (scroller.current) {
        setTimeout(() => {
          if (scroller.current) {
            scroller.current.scrollTo({
              top: scroller.current.scrollHeight,
              behavior: behavior
            });
          }
        }, delay);
      }
    }, []);
    

    
    // Get session status information for debugging
    const getSessionStatus = () => {
      return {
        currentSessionId,
        currentSessionBusy: getCurrentSessionBusy(),
        allSessionsBusy: Object.fromEntries(busyBySession),
        totalBusySessions: busyBySession.size,
        toolCallsBySession: Object.fromEntries(toolCallsBySession),
        hideToolCallIndicatorsBySession: Object.fromEntries(hideToolCallIndicatorsBySession)
      };
    };

    // Emit busy state updates to ProjectView
    useEffect(() => {
      if (projectId) {
        window.dispatchEvent(new CustomEvent('session-busy-update', {
          detail: {
            projectId,
            busyBySession: Array.from(busyBySession.entries())
          }
        }));
      }
    }, [busyBySession, projectId]);
    
    // Track if we're currently loading messages to prevent save loops
    const isLoadingMessagesRef = useRef(false);

    // Load messages for current session when session changes
    useEffect(() => {
      if (currentSessionId) {
        const currentSession = sessions.find(s => s.id === currentSessionId);
        if (currentSession && currentSession.messages) {
          console.log(`Loading ${currentSession.messages.length} messages for session ${currentSessionId}`);
          isLoadingMessagesRef.current = true;
          // setMessages(currentSession.messages); // This line is removed
          // Reset the flag after a brief delay to allow the save effect to see it
          setTimeout(() => {
            isLoadingMessagesRef.current = false;
          }, 0);
        } else {
          console.log(`No messages found for session ${currentSessionId}, starting with empty messages`);
          isLoadingMessagesRef.current = true;
          // setMessages([]); // This line is removed
          setTimeout(() => {
            isLoadingMessagesRef.current = false;
          }, 0);
        }
      }
    }, [currentSessionId, sessions]);

    // Save messages to current session whenever they change (but not during loading)
    useEffect(() => {
      if (currentSessionId && messages.length > 0 && !isLoadingMessagesRef.current) {
        console.log(`Saving session ${currentSessionId} with ${messages.length} messages`);
        saveCurrentSession(messages);
      }
    }, [messages, currentSessionId, saveCurrentSession]);

    // (Removed debug session storage helper)

    // Check terminal status on mount and when current session's busy state changes
    const checkTerminalStatus = useCallback(async () => {
      try {
        const status = await window.cursovable.getTerminalStatus();
        setTerminalStatus(status);
        
        // Add status message if there are issues
        if (status.status === 'error' || status.status === 'idle') {
          // setMessages(m => [...m, { 
          //   who: 'assistant', 
          //   text: `**Terminal Status:** ${status.status} - ${status.message || 'No message'}`, 
          //   rawData: { terminalStatus: status }
          // }]); // This line is removed
        }
      } catch (err) {
        setTerminalStatus({ error: err.message });
        
        // Add error message
        // setMessages(m => [...m, { 
        //   who: 'assistant', 
        //   text: `**Terminal Status Error:** ${err.message}`, 
        //   rawData: { error: err.message }
        // }]); // This line is removed
      }
    }, []);
    
    useEffect(() => {
      checkTerminalStatus();
    }, [currentSessionId, busyBySession, checkTerminalStatus]);
    
    
    // Auto-scroll to bottom when new messages are added
    useEffect(() => {
      if (scroller.current && messages.length > 0) {
        const shouldScroll = scroller.current.scrollTop + scroller.current.clientHeight >= scroller.current.scrollHeight - 100;
        if (shouldScroll) {
          scrollToBottom('smooth', 100);
        }
      }
    }, [messages, scrollToBottom]);

    // Reset textarea height when input changes
    useEffect(() => {
      const textarea = document.querySelector('.input textarea');
      if (textarea && !input) {
        textarea.style.height = '64px';
      }
    }, [input]);
    
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
  
     // Auto-scroll to bottom when messages change
     useEffect(() => {
       scrollToBottom('smooth', 50);
     }, [messages, currentSessionId, busyBySession, scrollToBottom]);
     
     // Auto-scroll when streaming text updates
     useEffect(() => {
       const streamingText = getCurrentSessionStreamingText();
       if (streamingText && streamingText.length > 0) {
         scrollToBottom('smooth', 50);
       }
     }, [getCurrentSessionStreamingText, scrollToBottom]);
     
     // Auto-scroll when tool calls update
     useEffect(() => {
       const toolCalls = getCurrentSessionToolCalls();
       if (toolCalls && toolCalls.size > 0) {
         scrollToBottom('smooth', 100);
       }
     }, [getCurrentSessionToolCalls, scrollToBottom]);
     
     // Auto-scroll when session busy state changes (new content incoming)
     useEffect(() => {
       const isBusy = getCurrentSessionBusy();
       if (isBusy) {
         // When session becomes busy, scroll to bottom to show new content area
         scrollToBottom('smooth', 50);
       }
     }, [getCurrentSessionBusy, scrollToBottom]);
     
     // Auto-scroll when mini-game closes to ensure chat is visible
     useEffect(() => {
       if (!isMiniGameOpen) {
         scrollToBottom('smooth', 200);
       }
     }, [isMiniGameOpen, scrollToBottom]);
     
     // Auto-scroll when search is cleared to return to normal view
     useEffect(() => {
       if (!searchQuery) {
         scrollToBottom('smooth', 100);
       }
     }, [searchQuery, scrollToBottom]);
    
    // Use the extracted send hook
    const { sendMessage } = useChatSend({
      currentSessionId,
      sessions,
      setSessionBusy,
      setSessionToolCalls,
      getCurrentSessionToolCalls,
      setSessionHideToolCallIndicators,
      markSessionRunningTerminal,
      send // Get the send function from SessionProvider
    });

 
    // Auto-send initial message once when cwd and initialMessage are present
    const hasAutoSentRef = useRef(false);
    useEffect(() => {
      if (!hasAutoSentRef.current && initialMessage && cwd) {
        hasAutoSentRef.current = true;
        sendMessage(initialMessage);
      }
    }, [initialMessage, cwd]);

    // Ensure we unsubscribe from any log listener on unmount to avoid leaks
    useEffect(() => {
      return () => {
        try { if (unsubRef.current) unsubRef.current(); } catch {}
        unsubRef.current = null;
      };
    }, []);

    return (
      <>
        <Header
          sessionName={sessions.find(s => s.id === currentSessionId)?.name}
          showSearch={showSearch}
          onToggleSearch={() => setShowSearch(!showSearch)}
          showSessionList={showSessionList}
          onToggleSessionList={() => setShowSessionList(!showSessionList)}
          onNewSession={() => { createNewSession(); setShowSessionList(false); }}
          currentSession={sessions.find(s => s.id === currentSessionId)}
          allSessions={sessions}
        />

        <SessionList
          showSessionList={showSessionList}
          sessions={sessions}
          currentSessionId={currentSessionId}
          createNewSession={createNewSession}
          loadSession={loadSession}
          deleteSession={deleteSession}
          setShowSessionList={setShowSessionList}
          busyBySession={busyBySession} // Pass busy state to show which sessions are active
        />

        
        {/* Search bar */}
        <SearchBar
          showSearch={showSearch}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          currentSearchIndex={currentSearchIndex}
          setCurrentSearchIndex={setCurrentSearchIndex}
          filteredMessages={filteredMessages}
          messages={messages}
          navigateSearch={navigateSearch}
        />
        
        <MessagesContainer
          scroller={scroller}
          filteredMessages={filteredMessages}
          toolCalls={getCurrentSessionToolCalls()}
          searchQuery={searchQuery}
          cwd={cwd}
          hideToolCallIndicators={getCurrentSessionHideToolCallIndicators()}
          streamingText={getCurrentSessionStreamingText()}
        />
         
        {/* Status indicators at the bottom */}
        <StatusIndicators 
          busy={getCurrentSessionBusy()} 
          onPlayMiniGame={onPlayMiniGame}
          isMiniGameOpen={isMiniGameOpen}
        />
        
        <InputBar
          value={input}
          onChange={setInput}
          onSubmit={sendMessage}
          disabled={getCurrentSessionBusy() || !cwd}
          model={model}
          setModel={setModel}
          suggestedModels={suggestedModels}
          isMiniGameOpen={isMiniGameOpen}
          onCloseMiniGame={onCloseMiniGame}
          isSessionBusy={getCurrentSessionBusy()}
          gameTimeLeft={gameTimeLeft}
        />
      </>
    );
  } catch (error) {
    console.error('Chat component initialization error:', error);
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <h2>Chat Initialization Error</h2>
        <p>There was an error initializing the chat component. Please check the console for details.</p>
        <pre>{error.message}</pre>
      </div>
    );
  }
}
