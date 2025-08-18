
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

import { styles } from './Chat/styles';

export default function Chat({ cwd, initialMessage, projectId }) {
  // Add CSS animations and styles
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = styles
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  
  // Load sessions and initialize on mount
  useEffect(() => {
    console.log(`Loading sessions for project: ${projectId || 'legacy'}`);
    const loadedSessions = loadSessions();
    console.log(`Found ${loadedSessions.length} existing sessions:`, loadedSessions.map(s => ({id: s.id, name: s.name, messageCount: s.messages?.length || 0})));
    
    setSessions(loadedSessions);
    
    if (loadedSessions.length > 0) {
      // Load the most recent session
      const latestSession = loadedSessions.reduce((latest, session) => 
        session.updatedAt > latest.updatedAt ? session : latest
      );
      console.log(`Loading latest session: ${latestSession.name} (${latestSession.id}) with ${latestSession.messages?.length || 0} messages`);
      setCurrentSessionId(latestSession.id);
      setMessages(latestSession.messages || []);
      setToolCalls(new Map());
      setHideToolCallIndicators(false);
    } else {
      // Create a new session if none exist
      console.log('No existing sessions found, creating new session');
      createNewSession(loadedSessions);
    }
  }, [projectId]);

  
  
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [terminalStatus, setTerminalStatus] = useState(null);
  const [toolCalls, setToolCalls] = useState(new Map()); // Track tool calls by call_id
  const [hideToolCallIndicators, setHideToolCallIndicators] = useState(false); // Hide tool call cards after result
  const [searchQuery, setSearchQuery] = useState(''); // New: search functionality
  const [showSearch, setShowSearch] = useState(false); // New: toggle search visibility
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0); // Track current search result
  const [sessions, setSessions] = useState([]); // All sessions for this project
  const [currentSessionId, setCurrentSessionId] = useState(null); // Current active session
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


  console.log('toolCalls 1', toolCalls);
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

  // Session storage functions
  const getSessionStorageKey = () => `cursovable-sessions-${projectId || 'legacy'}`;
  
  // Derive a session name from the first user message
  const deriveSessionNameFromMessage = (text) => {
    if (!text || typeof text !== 'string') return 'Untitled';
    // Trim, collapse whitespace, strip newlines
    let name = text.trim().replace(/\s+/g, ' ');
    // Remove markdown code fences/backticks that could bloat UI
    name = name.replace(/`{1,3}/g, '');
    // Limit length to avoid breaking UI
    const maxLen = 60;
    if (name.length > maxLen) name = name.slice(0, maxLen - 1) + '…';
    return name || 'Untitled';
  };

  const loadSessions = () => {
    try {
      const savedSessions = localStorage.getItem(getSessionStorageKey());
      if (savedSessions) {
        const parsed = JSON.parse(savedSessions);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (error) {
      console.warn('Failed to load sessions from localStorage:', error);
    }
    return [];
  };
  
  const saveSessions = (sessionsToSave) => {
    try {
      localStorage.setItem(getSessionStorageKey(), JSON.stringify(sessionsToSave));
    } catch (error) {
      console.warn('Failed to save sessions to localStorage:', error);
    }
  };
  
  const createNewSession = (existingSessions = null) => {
    const currentSessions = existingSessions || sessions;
    const newSessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    const isFirstSession = currentSessions.length === 0;
    const newSession = {
      id: newSessionId,
      name: `Session ${new Date().toLocaleString()}`,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isFirstSession: isFirstSession // Mark if this is the very first session
    };
    
    const updatedSessions = [...currentSessions, newSession];
    setSessions(updatedSessions);
    saveSessions(updatedSessions);
    setCurrentSessionId(newSessionId);
    setMessages([]);
    setToolCalls(new Map());
    setHideToolCallIndicators(false);
    setIsCreatingNewSession(false);
    
    console.log(`Created new session: ${newSessionId} (${newSession.name})`);
    return newSessionId;
  };
  
  const loadSession = (sessionId, sessionsToSearch = null) => {
    const currentSessions = sessionsToSearch || sessions;
    const session = currentSessions.find(s => s.id === sessionId);
    if (session) {
      console.log(`Loading session ${sessionId} with ${session.messages?.length || 0} messages`);
      setCurrentSessionId(sessionId);
      setMessages(session.messages || []);
      setToolCalls(new Map());
      setHideToolCallIndicators(false);
    } else {
      console.warn(`Session ${sessionId} not found in current sessions`);
    }
  };
  
  const saveCurrentSession = () => {
    if (!currentSessionId) {
      console.warn('No current session ID, cannot save');
      return;
    }
    
    setSessions(prevSessions => {
      const updatedSessions = prevSessions.map(session => 
        session.id === currentSessionId 
          ? { 
              ...session, 
              // Keep name (possibly set from first message); only derive name if still default
              name: session.name && session.name.startsWith('Session ')
                ? (messages.find(msg => msg.who === 'user')
                    ? deriveSessionNameFromMessage(messages.find(msg => msg.who === 'user').text)
                    : session.name)
                : session.name,
              messages, 
              updatedAt: Date.now() 
            }
          : session
      );
      
      // Save to localStorage
      try {
        localStorage.setItem(getSessionStorageKey(), JSON.stringify(updatedSessions));
        console.log(`Session ${currentSessionId} saved with ${messages.length} messages`);
      } catch (error) {
        console.error('Failed to save sessions to localStorage:', error);
      }
      
      return updatedSessions;
    });
  };
  
  const deleteSession = (sessionId) => {
    const updatedSessions = sessions.filter(s => s.id !== sessionId);
    setSessions(updatedSessions);
    saveSessions(updatedSessions);
    
    if (currentSessionId === sessionId) {
      if (updatedSessions.length > 0) {
        loadSession(updatedSessions[0].id);
      } else {
        createNewSession();
      }
    }
  };


  // Save messages to current session whenever they change
  useEffect(() => {
    if (currentSessionId && messages.length > 0) {
      console.log(`Saving session ${currentSessionId} with ${messages.length} messages`);
      saveCurrentSession();
    }
  }, [messages, currentSessionId, sessions]);

  // (Removed debug session storage helper)

  // Check terminal status on mount and when busy changes
  useEffect(() => {
    checkTerminalStatus();
  }, [busy]);
  
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
  }, [messages, busy]);

  // Use the extracted send hook
  const { send, cleanup: cleanupSend } = useChatSend({
    // State setters
    setMessages,
    setBusy,
    setToolCalls,
    setHideToolCallIndicators,
    setSessions,
    
    // State values
    input,
    setInput,
    busy,
    cwd,
    model,
    sessions,
    currentSessionId,
    toolCalls,
    
    // Functions
    deriveSessionNameFromMessage,
    getSessionStorageKey,
    saveSessions,
    checkTerminalStatus,
    
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
        toolCalls={toolCalls}
        searchQuery={searchQuery}
        cwd={cwd}
        hideToolCallIndicators={hideToolCallIndicators}
      />
      
   
      
      {/* Status indicators at the bottom */}
      <StatusIndicators busy={busy} />
      
      <InputBar
        value={input}
        onChange={setInput}
        onSubmit={send}
        disabled={busy || !cwd}
        model={model}
        setModel={setModel}
        suggestedModels={suggestedModels}
      />
    </>
  );
}
