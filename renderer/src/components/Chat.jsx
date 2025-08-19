
import React, { useEffect, useRef, useState } from 'react';
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

export default function Chat({ cwd, initialMessage, projectId }) {
  const {
    sessions,
    currentSessionId,
    busyBySession,
    toolCallsBySession,
    hideToolCallIndicatorsBySession,
    createNewSession,
    loadSession,
    deleteSession,
    updateSessionWithCursorId,
    saveCurrentSession,
    setSessionBusy,
    setSessionToolCalls,
    setSessionHideToolCallIndicators,
    getCurrentSessionBusy,
    getCurrentSessionToolCalls,
    getCurrentSessionHideToolCallIndicators,
    deriveSessionNameFromMessage
  } = useSession();

  // Add CSS animations and styles
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = styles
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  
  
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [terminalStatus, setTerminalStatus] = useState(null);
  const [searchQuery, setSearchQuery] = useState(''); // New: search functionality
  const [showSearch, setShowSearch] = useState(false); // New: toggle search visibility
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0); // Track current search result
  const [showSessionList, setShowSessionList] = useState(false); // Toggle session list UI
  const [isCreatingNewSession, setIsCreatingNewSession] = useState(false); // Creating new session state
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

  // Debug logging for session state
  useEffect(() => {
    console.log('Session state updated:', getSessionStatus());
    console.log('Current session tool calls:', getCurrentSessionToolCalls());
  }, [currentSessionId, busyBySession, toolCallsBySession, hideToolCallIndicatorsBySession]);

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
        setMessages(currentSession.messages);
        // Reset the flag after a brief delay to allow the save effect to see it
        setTimeout(() => {
          isLoadingMessagesRef.current = false;
        }, 0);
      } else {
        console.log(`No messages found for session ${currentSessionId}, starting with empty messages`);
        isLoadingMessagesRef.current = true;
        setMessages([]);
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
  useEffect(() => {
    checkTerminalStatus();
  }, [currentSessionId, busyBySession]);
  
  // Debug log when session status changes
  useEffect(() => {
    console.log('Session status updated:', getSessionStatus());
  }, [busyBySession, currentSessionId]);
  
  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (scroller.current && messages.length > 0) {
      const shouldScroll = scroller.current.scrollTop + scroller.current.clientHeight >= scroller.current.scrollHeight - 100;
      if (shouldScroll) {
        setTimeout(() => {
          if (scroller.current) {
            scroller.current.scrollTop = scroller.current.scrollHeight;
          }
        }, 100);
      }
    }
  }, [messages]);

  // Reset textarea height when input changes
  useEffect(() => {
    const textarea = document.querySelector('.input textarea');
    if (textarea && !input) {
      textarea.style.height = '64px';
    }
  }, [input]);
  
  // Filter messages based on search query
  const filteredMessages = messages.filter(m => {
    if (!searchQuery.trim()) return true;
    return m.text.toLowerCase().includes(searchQuery.toLowerCase());
  });

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

 
  async function checkTerminalStatus() {
    try {
      const status = await window.cursovable.getTerminalStatus();
      setTerminalStatus(status);
      
      // Add status message if there are issues
      if (status.status === 'error' || status.status === 'idle') {
        setMessages(m => [...m, { 
          who: 'assistant', 
          text: `**Terminal Status:** ${status.status} - ${status.message || 'No message'}`, 
          rawData: { terminalStatus: status }
        }]);
      }
    } catch (err) {
      setTerminalStatus({ error: err.message });
      
      // Add error message
      setMessages(m => [...m, { 
        who: 'assistant', 
        text: `**Terminal Status Error:** ${err.message}`, 
        rawData: { error: err.message }
      }]);
    }
  }


  useEffect(() => {
    if (scroller.current) {
      scroller.current.scrollTop = scroller.current.scrollHeight;
    }
  }, [messages, currentSessionId, busyBySession]);



  // Use the extracted send hook
  const { send, cleanup: cleanupSend } = useChatSend({
    // State setters
    setMessages,
    setSessionBusy, // Use per-session busy state
    setSessionToolCalls, // Use per-session tool calls
    setSessionHideToolCallIndicators, // Use per-session hide indicators
    
    // State values
    input,
    setInput,
    getCurrentSessionBusy, // Get current session's busy state
    cwd,
    model,
    sessions,
    currentSessionId,
    getCurrentSessionToolCalls, // Get current session's tool calls
    
    // Functions
    deriveSessionNameFromMessage,
    checkTerminalStatus,
    updateSessionWithCursorId, // Add function to update session with cursor ID
    
    // Project context
    projectId
  });

  // Auto-send initial message once when cwd and initialMessage are present
  const hasAutoSentRef = useRef(false);
  useEffect(() => {
    if (!hasAutoSentRef.current && initialMessage && cwd) {
      hasAutoSentRef.current = true;
      send(initialMessage);
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
      

      


      {/* Debug logging for tool calls */}
      {(() => {
        const toolCalls = getCurrentSessionToolCalls();
        const hideIndicators = getCurrentSessionHideToolCallIndicators();
        console.log('MessagesContainer props:', {
          toolCalls: toolCalls,
          toolCallsSize: toolCalls.size,
          hideIndicators,
          currentSessionId,
          isMap: toolCalls instanceof Map
        });
        return null;
      })()}

      <MessagesContainer
        scroller={scroller}
        filteredMessages={filteredMessages}
        toolCalls={getCurrentSessionToolCalls()}
        searchQuery={searchQuery}
        cwd={cwd}
        hideToolCallIndicators={getCurrentSessionHideToolCallIndicators()}
      />
      
   
      
      {/* Status indicators at the bottom */}
      <StatusIndicators busy={getCurrentSessionBusy()} />
      
      <InputBar
        value={input}
        onChange={setInput}
        onSubmit={send}
        disabled={getCurrentSessionBusy() || !cwd}
        model={model}
        setModel={setModel}
        suggestedModels={suggestedModels}
      />
    </>
  );
}
