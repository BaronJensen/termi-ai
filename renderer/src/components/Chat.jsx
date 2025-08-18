
import React, { useEffect, useRef, useState } from 'react';
import Bubble from './Chat/Bubble';
import Header from './Chat/Header';
import MessageList from './Chat/MessageList';
import InputBar from './Chat/InputBar';
import ToolCallIndicator from './Chat/ToolCallIndicator';
import SessionList from './Chat/SessionList';
import { useChatSend } from './Chat/hooks/useChatSend';
import { loadSettings } from '../store/settings';
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
  const [globalActionLogExpanded, setGlobalActionLogExpanded] = useState(true); // Global action log expanded state
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
  const streamIndexRef = useRef(-1);
  const runIdRef = useRef(null);
  const runTimeoutRef = useRef(null);
  const lastChunkRef = useRef('');
  const sawJsonRef = useRef(false);

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

  // (Removed debug/session-first-message helpers)

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

  // Export conversation to JSON
  const exportConversation = () => {
    try {
      const dataStr = JSON.stringify(messages, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `cursovable-conversation-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export conversation:', error);
      alert('Failed to export conversation');
    }
  };

  // Clear conversation
  const clearConversation = () => {
    if (confirm('Are you sure you want to clear all messages? This action cannot be undone.')) {
      setMessages([]);
      setToolCalls(new Map());
      setHideToolCallIndicators(false);
    }
  };

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

  async function forceCleanup() {
    try {
      const result = await window.cursovable.forceTerminalCleanup();
      await checkTerminalStatus();
      setMessages(m => [...m, { who: 'assistant', text: `**Cleanup completed:** ${result.message}. Cleaned ${result.processesCleaned} processes.`, rawData: { cleanup: result } }]);
    } catch (err) {
      setMessages(m => [...m, { who: 'assistant', text: `**Cleanup failed:** ${err.message}`, rawData: { error: err.message } }]);
    }
  }

  // Force reset streaming state if something goes wrong
  function forceResetStreamingState() {
    if (unsubRef.current) { 
      try { unsubRef.current(); } catch {} 
      unsubRef.current = null; 
    }
    streamIndexRef.current = -1;
    runIdRef.current = null;
    setBusy(false);
    
    // Reset tool call indicator visibility
    setHideToolCallIndicators(false);
    
    // Clear tool calls with animations if any exist
    if (toolCalls.size > 0) {
      clearAllToolCallsWithAnimation();
    }
    
    // Add a message to inform the user
    setMessages(m => [...m, { 
      who: 'assistant', 
      text: '**Streaming state reset:** Cleared all active streams and tool calls.', 
      rawData: { action: 'reset_streaming_state' }
    }]);
  }

  // Clear all tool calls manually
  function clearToolCalls() {
    setToolCalls(new Map());
    setMessages(m => [...m, { 
      who: 'assistant', 
      text: '**Tool calls cleared:** All tool call indicators have been removed.', 
      rawData: { action: 'clear_tool_calls' }
    }]);
  }

  // Keep all tool calls permanently - no auto-cleanup
  // The action log will show the complete history

  // Enhanced cleanup function that clears all tool calls
  function clearAllToolCallsWithAnimation() {
    if (toolCalls.size === 0) return;
    
    setToolCalls(new Map());
    
    // Add a message to inform the user
    setMessages(m => [...m, { 
      who: 'assistant', 
      text: '**All tool calls cleared:** All tool call indicators have been removed.', 
      rawData: { action: 'clear_all_tool_calls' }
    }]);
  }

  // Clear only completed tool calls
  function clearCompletedToolCallsWithAnimation() {
    const completedCallIds = Array.from(toolCalls.entries())
      .filter(([_, toolCallInfo]) => toolCallInfo.isCompleted)
      .map(([callId, _]) => callId);
    
    if (completedCallIds.length === 0) return;
    
    setToolCalls(current => {
      const updated = new Map(current);
      completedCallIds.forEach(callId => updated.delete(callId));
      return updated;
    });
    
    // Add a message to inform the user
    setMessages(m => [...m, { 
      who: 'assistant', 
      text: `**Completed tools cleared:** ${completedCallIds.length} completed tool call indicators have been removed.`, 
      rawData: { action: 'clear_completed_tool_calls', count: completedCallIds.length }
    }]);
  }

  // Force cleanup all tool calls immediately (no animations, for debugging)
  function forceClearAllToolCalls() {
    if (toolCalls.size === 0) return;
    
    setToolCalls(new Map());
    
    // Add a message to inform the user
    setMessages(m => [...m, { 
      who: 'assistant', 
      text: `**Force cleared:** All ${toolCalls.size} tool call indicators have been immediately removed.`, 
      rawData: { action: 'force_clear_all_tool_calls', count: toolCalls.size }
    }]);
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
      {showSearch && (
        <div className="search-container copyable-container" style={{
          padding: '8px 12px',
          margin: '8px 0',
          backgroundColor: '#0b1018',
          borderRadius: '4px',
          fontSize: '12px',
          fontFamily: 'monospace',
          border: '1px solid #1d2633',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#e6e6e6'
        }}>
          <span>🔍</span>
          <input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              background: '#1a2331',
              border: '1px solid #27354a',
              color: '#e6e6e6',
              padding: '4px 8px',
              borderRadius: '3px',
              fontSize: '12px',
              outline: 'none'
            }}
            aria-label="Search messages"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setCurrentSearchIndex(0);
              }}
              style={{
                fontSize: '10px',
                padding: '2px 6px',
                backgroundColor: '#6b7280',
                color: '#e6e6e6',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
          <span style={{ fontSize: '10px', opacity: 0.7 }}>
            {filteredMessages.length} / {messages.length} messages
          </span>
          {searchQuery && filteredMessages.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                onClick={() => navigateSearch('prev')}
                style={{
                  fontSize: '10px',
                  padding: '2px 6px',
                  backgroundColor: '#6b7280',
                  color: '#e6e6e6',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
                title="Previous result"
                aria-label="Go to previous search result"
              >
                ↑
              </button>
              <span style={{ fontSize: '10px', minWidth: '20px', textAlign: 'center' }}>
                {currentSearchIndex + 1}
              </span>
              <button
                onClick={() => navigateSearch('next')}
                style={{
                  fontSize: '10px',
                  padding: '2px 6px',
                  backgroundColor: '#6b7280',
                  color: '#e6e6e6',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
                title="Next result"
                aria-label="Go to next search result"
              >
                ↓
              </button>
            </div>
          )}
        </div>
      )}
      

      
      <div className="messages" ref={scroller}>
        <MessageList messages={filteredMessages} toolCalls={toolCalls} searchQuery={searchQuery} cwd={cwd || ''} />

        {/* Tool Call Indicators - Only show while conversation is active */}
        {!hideToolCallIndicators && Array.from(toolCalls.entries()).map(([callId, toolCallInfo], index) => {
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
      
   
      
      {/* Status indicators at the bottom */}
      {busy && (
        <div className="status-indicators copyable-container" style={{
          padding: '16px',
          margin: '12px 0',
          background: 'linear-gradient(135deg, #0b1018 0%, #1a2331 100%)',
          borderRadius: '12px',
          border: '1px solid #1d2633',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          fontSize: '14px',
          color: '#e6e6e6',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          transition: 'all 0.3s ease'
        }}>
          <div className="spinner" style={{
            width: '20px',
            height: '20px',
            border: '3px solid #1a2331',
            borderTop: '3px solid #3c6df0',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <div className="copyable-text" style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
            <span style={{ fontWeight: '500', color: '#3c6df0' }}>🤔 Thinking...</span>
            <span style={{ fontSize: '12px', opacity: 0.7, color: '#c9d5e1' }}>
              Processing your request with cursor-agent...
            </span>
          </div>
          <button
            onClick={() => {
              const text = '🤔 Thinking... Processing your request with cursor-agent...';
              navigator.clipboard.writeText(text);
            }}
            className="copy-button"
            title="Copy status message"
            aria-label="Copy status message"
          >
            Copy
          </button>
        </div>
      )}
      
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
