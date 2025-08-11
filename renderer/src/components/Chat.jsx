
import React, { useEffect, useRef, useState } from 'react';
import Bubble from './Chat/Bubble';
import ToolCallIndicator from './Chat/ToolCallIndicator';

export default function Chat({ cwd, initialMessage, projectId }) {
  // Add CSS animations and styles
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      @keyframes typewriter {
        from { 
          opacity: 0.8;
          transform: translateY(2px);
        }
        to { 
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      @keyframes slideInFromRight {
        from {
          opacity: 0;
          transform: translateX(100px) scale(0.8);
        }
        to {
          opacity: 1;
          transform: translateX(0) scale(1);
        }
      }
      
      @keyframes slideOutToLeft {
        from {
          opacity: 1;
          transform: translateX(0) scale(1);
        }
        to {
          opacity: 0;
          transform: translateX(-100px) scale(0.8);
        }
      }
      
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(20px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      
      @keyframes pulse {
        0%, 100% {
          transform: scale(1);
          opacity: 1;
        }
        50% {
          transform: scale(1.05);
          opacity: 0.8;
        }
      }
      
      @keyframes bounce {
        0%, 20%, 53%, 80%, 100% {
          transform: translate3d(0,0,0);
        }
        40%, 43% {
          transform: translate3d(0,-8px,0);
        }
        70% {
          transform: translate3d(0,-4px,0);
        }
        90% {
          transform: translate3d(0,-2px,0);
        }
      }
      
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(20px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      
      @keyframes slideDown {
        from {
          opacity: 0;
          max-height: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          max-height: 300px;
          transform: translateY(0);
        }
      }
      
      .streaming-text {
        display: inline-block;
        white-space: pre-wrap;
        word-wrap: break-word;
        max-width: 100%;
        height: auto;
        min-height: fit-content;
        animation: typewriter 0.15s ease-out;
        transition: all 0.1s ease;
      }
      
      .bubble {
        max-width: 100%;
        word-wrap: break-word;
        overflow-wrap: break-word;
        white-space: pre-wrap;
        padding: 12px 16px;
        margin: 8px 0;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        transition: all 0.2s ease;
        min-height: fit-content;
        height: auto;
        font-size: 13px;
      }
      
      .bubble.assistant {
        background: linear-gradient(135deg, #0b1018 0%, #1a2331 100%);
        border-left: 4px solid #3c6df0;
        margin-right: 20px;
        color: #e6e6e6;
      }
      
      .bubble.user {
        background: linear-gradient(135deg, #172033 0%, #2d3d57 100%);
        color: #e6e6e6;
        margin-left: 20px;
        text-align: right;
      }
      
      .bubble:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      }
      
      .messages {
        flex: 1;
        overflow-y: auto;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        height: auto;
        min-height: 0;
      }
      
      .input {
        display: grid;
        grid-template-columns: 1fr auto;
        grid-template-rows: auto auto;
        grid-column-gap: 12px;
        grid-row-gap: 6px;
        align-items: stretch;
        width: 100%;
        box-sizing: border-box;
        margin-top: 8px;
      }
      
      .input textarea {
        flex: 1;
        resize: vertical;
        min-height: 64px;
        max-height: 200px;
        background: #0b0f16;
        border: 1px solid #27354a;
        color: #d6dee8;
        padding: 10px;
        border-radius: 10px;
        outline: none;
        font-family: inherit;
        line-height: 1.4;
        width: 100%;
        box-sizing: border-box;
      }

      .input-field { grid-column: 1; grid-row: 1; }
      .shortcut-hint {
        grid-column: 1;
        grid-row: 2;
        font-size: 10px;
        color: #6b7280;
        font-family: monospace;
        justify-self: start;
        align-self: center;
      }

      .send-button {
        min-width: 110px;
        padding: 0 18px;
        border: 1px solid #2a3b55;
        border-radius: 12px;
        background: linear-gradient(135deg, rgba(60,109,240,0.9) 0%, rgba(59,130,246,0.85) 50%, rgba(37,99,235,0.9) 100%);
        color: #f2f6ff;
        font-weight: 600;
        letter-spacing: 0.2px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        box-shadow: 0 6px 16px rgba(59,130,246,0.35), inset 0 1px 0 rgba(255,255,255,0.15);
        transition: transform 0.08s ease, box-shadow 0.2s ease, filter 0.2s ease, opacity 0.2s ease;
        cursor: pointer;
        align-self: stretch;
        grid-column: 2;
        grid-row: 1 / span 2;
      }

      .send-button:hover:not(:disabled) {
        box-shadow: 0 10px 24px rgba(59,130,246,0.45), inset 0 1px 0 rgba(255,255,255,0.2);
        filter: brightness(1.06);
        transform: translateY(-1px);
      }

      .send-button:active:not(:disabled) {
        transform: translateY(0);
        filter: brightness(0.98);
      }

      .send-button:disabled {
        cursor: not-allowed;
        filter: grayscale(20%);
      }
      
      /* Global copy functionality */
      .copyable-text {
        user-select: text;
        cursor: text;
        -webkit-user-select: text;
        -moz-user-select: text;
        -ms-user-select: text;
      }
      
      .copyable-text:hover {
        background-color: rgba(60, 109, 240, 0.1);
        border-radius: 2px;
        padding: 1px 2px;
        margin: -1px -2px;
      }
      
      .copy-button {
        position: absolute;
        top: 8px;
        right: 8px;
        background: rgba(60, 109, 240, 0.8);
        color: #e6e6e6;
        border: none;
        borderRadius: '4px';
        padding: '4px 8px';
        fontSize: '10px';
        cursor: pointer;
        opacity: 0;
        transition: opacity 0.2s ease;
        zIndex: 10;
      }
      
      .copy-button:hover {
        opacity: 1;
      }
      
      .copyable-container {
        position: relative;
      }
      
      .copyable-container:hover .copy-button {
        opacity: 1;
      }
      
      /* Accessibility improvements */
      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }
      
      /* Focus styles for better accessibility */
      .bubble:focus,
      .input textarea:focus,
      button:focus {
        outline: 2px solid #3c6df0;
        outline-offset: 2px;
      }
      
      /* High contrast mode support */
      @media (prefers-contrast: high) {
        .bubble {
          border: 2px solid currentColor;
        }
        
        .copy-button {
          background: #000;
          color: #fff;
          border: 1px solid currentColor;
        }
      }
      
      /* Reduced motion support */
      @media (prefers-reduced-motion: reduce) {
        .streaming-text,
        .bubble,
        .copy-button {
          animation: none;
          transition: none;
        }
      }
      
      /* Markdown content styles */
      .markdown-content {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.55;
        color: #e6e6e6;
        font-size: 13px;
      }
      
      .markdown-content h1,
      .markdown-content h2,
      .markdown-content h3,
      .markdown-content h4,
      .markdown-content h5,
      .markdown-content h6 {
        margin: 16px 0 8px 0;
        color: #3c6df0;
        font-weight: 600;
        line-height: 1.3;
      }
      
      .markdown-content h1 { font-size: 1.5em; border-bottom: 2px solid #3c6df0; padding-bottom: 4px; }
      .markdown-content h2 { font-size: 1.3em; border-bottom: 1px solid #3c6df0; padding-bottom: 2px; }
      .markdown-content h3 { font-size: 1.1em; }
      .markdown-content h4 { font-size: 1em; }
      .markdown-content h5 { font-size: 0.9em; }
      .markdown-content h6 { font-size: 0.8em; }
      
      .markdown-content p {
        margin: 8px 0;
        line-height: 1.6;
      }
      
      .markdown-content ul,
      .markdown-content ol {
        margin: 8px 0;
        padding-left: 24px;
      }
      
      .markdown-content li {
        margin: 4px 0;
        line-height: 1.5;
      }
      
      .markdown-content blockquote {
        margin: 12px 0;
        padding: 8px 16px;
        border-left: 4px solid #3c6df0;
        background: rgba(60, 109, 240, 0.1);
        border-radius: 4px;
        font-style: italic;
        color: #c9d5e1;
      }
      
      .markdown-content strong,
      .markdown-content b {
        color: #ffffff;
        font-weight: 600;
      }
      
      .markdown-content em,
      .markdown-content i {
        color: #c9d5e1;
        font-style: italic;
      }
      
      .markdown-content code {
        background: rgba(15, 23, 42, 0.8);
        color: #fbbf24;
        padding: 2px 6px;
        border-radius: 4px;
        font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
        font-size: 0.9em;
        border: 1px solid #374151;
      }
      
      .markdown-content pre {
        background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
        border: 1px solid #334155;
        border-radius: 8px;
        padding: 16px;
        margin: 16px 0;
        overflow-x: auto;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        position: relative;
      }
      
      .markdown-content pre code {
        background: transparent;
        color: #e2e8f0;
        padding: 0;
        border: none;
        font-size: 0.9em;
        line-height: 1.5;
        display: block;
        white-space: pre;
        overflow-x: auto;
      }
      
      .markdown-content pre::before {
        content: '📄';
        position: absolute;
        top: 8px;
        right: 12px;
        font-size: 12px;
        opacity: 0.6;
        color: #64748b;
      }
      
      .markdown-content table {
        border-collapse: collapse;
        width: 100%;
        margin: 16px 0;
        background: rgba(15, 23, 42, 0.6);
        border-radius: 8px;
        overflow: hidden;
        border: 1px solid #334155;
      }
      
      .markdown-content th,
      .markdown-content td {
        padding: 8px 12px;
        text-align: left;
        border-bottom: 1px solid #334155;
      }
      
      .markdown-content th {
        background: rgba(60, 109, 240, 0.2);
        color: #3c6df0;
        font-weight: 600;
        font-size: 0.9em;
      }
      
      .markdown-content td {
        color: #e2e8f0;
        font-size: 0.9em;
      }
      
      .markdown-content tr:hover {
        background: rgba(60, 109, 240, 0.05);
      }
      
      .markdown-content a {
        color: #60a5fa;
        text-decoration: none;
        border-bottom: 1px solid transparent;
        transition: border-color 0.2s ease;
      }
      
      .markdown-content a:hover {
        border-bottom-color: #60a5fa;
        color: #93c5fd;
      }
      
      .markdown-content hr {
        border: none;
        height: 1px;
        background: linear-gradient(90deg, transparent, #3c6df0, transparent);
        margin: 24px 0;
      }
      
      .markdown-content .highlight {
        background: rgba(251, 191, 36, 0.1);
        border: 1px solid rgba(251, 191, 36, 0.3);
        border-radius: 4px;
        padding: 2px 4px;
        color: #fbbf24;
      }
      
      /* Tool call indicator styles */
      .tool-call-indicator {
        margin: 8px 0;
        padding: 8px 12px;
        background: linear-gradient(135deg, #0b1018 0%, #1a2331 100%);
        border: 1px solid #1d2633;
        border-radius: 8px;
        font-family: monospace;
        font-size: 12px;
        color: #e6e6e6;
        display: flex;
        align-items: center;
        gap: 12px;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        z-index: 1;
        animation: slideInFromRight 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        animation-delay: var(--animation-delay, 0s);
        transform-origin: center;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        backdrop-filter: blur(10px);
      }
      
      .tool-call-indicator:hover {
        border-color: #3c6df0;
        box-shadow: 0 8px 25px rgba(60, 109, 240, 0.3);
        transform: translateY(-3px) scale(1.03);
        background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      }
      
      .tool-call-spinner {
        width: 16px;
        height: 16px;
        border: 2px solid #3c6df0;
        border-top: 2px solid transparent;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        flex-shrink: 0;
        filter: drop-shadow(0 0 4px rgba(60, 109, 240, 0.5));
      }
      
      .tool-call-check {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
        font-size: 10px;
        font-weight: bold;
        flex-shrink: 0;
        animation: bounce 0.6s ease-out, fadeInUp 0.4s ease-out;
        box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
      }
      
      .tool-call-indicator .copy-button {
        position: absolute;
        top: 8px;
        right: 8px;
        background: linear-gradient(135deg, rgba(60, 109, 240, 0.8) 0%, rgba(59, 130, 246, 0.8) 100%);
        color: #e6e6e6;
        border: none;
        border-radius: 4px;
        padding: 4px 8px;
        font-size: 10px;
        cursor: pointer;
        opacity: 0;
        transition: all 0.2s ease;
        z-index: 10;
        transform: scale(0.9);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }
      
      .tool-call-indicator:hover .copy-button {
        opacity: 1;
        transform: scale(1);
      }
      
      .tool-call-indicator .copy-button:hover {
        background: linear-gradient(135deg, rgba(60, 109, 240, 1) 0%, rgba(59, 130, 246, 1) 100%);
        transform: scale(1.1);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  
  // Load sessions and initialize on mount
  useEffect(() => {
    const loadedSessions = loadSessions();
    setSessions(loadedSessions);
    
    if (loadedSessions.length > 0) {
      // Load the most recent session
      const latestSession = loadedSessions.reduce((latest, session) => 
        session.updatedAt > latest.updatedAt ? session : latest
      );
      loadSession(latestSession.id);
    } else {
      // Create a new session if none exist
      createNewSession();
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
  const scroller = useRef(null);
  const unsubRef = useRef(null);
  const streamIndexRef = useRef(-1);
  const runIdRef = useRef(null);

  // Session storage functions
  const getSessionStorageKey = () => `cursovable-sessions-${projectId || 'legacy'}`;
  
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
  
  const createNewSession = () => {
    const newSessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    const isFirstSession = sessions.length === 0;
    const newSession = {
      id: newSessionId,
      name: `Session ${new Date().toLocaleString()}`,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isFirstSession: isFirstSession // Mark if this is the very first session
    };
    
    const updatedSessions = [...sessions, newSession];
    setSessions(updatedSessions);
    saveSessions(updatedSessions);
    setCurrentSessionId(newSessionId);
    setMessages([]);
    setToolCalls(new Map());
    setHideToolCallIndicators(false);
    setIsCreatingNewSession(false);
    
    return newSessionId;
  };
  
  const loadSession = (sessionId) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      setCurrentSessionId(sessionId);
      setMessages(session.messages || []);
      setToolCalls(new Map());
      setHideToolCallIndicators(false);
    }
  };
  
  const saveCurrentSession = () => {
    if (!currentSessionId) return;
    
    const updatedSessions = sessions.map(session => 
      session.id === currentSessionId 
        ? { ...session, messages, updatedAt: Date.now() }
        : session
    );
    setSessions(updatedSessions);
    saveSessions(updatedSessions);
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

  // Utility function to identify sessions with first user message
  const getFirstUserMessageSession = () => {
    // Find session with first user message across all sessions for this project
    let earliestUserMessageSession = null;
    let earliestTimestamp = Infinity;
    
    sessions.forEach(session => {
      const firstUserMessage = (session.messages || []).find(msg => msg.who === 'user');
      if (firstUserMessage && firstUserMessage.rawData?.timestamp) {
        if (firstUserMessage.rawData.timestamp < earliestTimestamp) {
          earliestTimestamp = firstUserMessage.rawData.timestamp;
          earliestUserMessageSession = session;
        }
      }
    });
    
    if (earliestUserMessageSession) {
      console.log(`First user message session identified: "${earliestUserMessageSession.name}" (${earliestUserMessageSession.id}) with timestamp: ${new Date(earliestTimestamp).toLocaleString()}`);
    }
    
    return earliestUserMessageSession;
  };

  // Check if a session contains the very first user message for this project
  const isSessionWithFirstUserMessage = (session) => {
    const firstUserMessageSession = getFirstUserMessageSession();
    return firstUserMessageSession && firstUserMessageSession.id === session.id;
  };

  // Function to navigate to the session with the first user message
  const goToFirstUserMessageSession = () => {
    const firstSession = getFirstUserMessageSession();
    if (firstSession && firstSession.id !== currentSessionId) {
      loadSession(firstSession.id);
      setShowSessionList(false);
      
      // Show a brief notification
      setMessages(m => [...m, { 
        who: 'assistant', 
        text: `**Navigated to first session:** "${firstSession.name}" contains the first user message for this project.`,
        rawData: { action: 'navigate_to_first_session', sessionId: firstSession.id }
      }]);
    } else if (firstSession) {
      // Already in the first session
      setMessages(m => [...m, { 
        who: 'assistant', 
        text: `**Already viewing first session:** This session contains the first user message for this project.`,
        rawData: { action: 'already_in_first_session', sessionId: firstSession.id }
      }]);
    } else {
      // No session with user messages found
      setMessages(m => [...m, { 
        who: 'assistant', 
        text: `**No user messages found:** No sessions contain user messages yet.`,
        rawData: { action: 'no_user_messages_found' }
      }]);
    }
  };

  // Save messages to current session whenever they change
  useEffect(() => {
    if (currentSessionId && messages.length > 0) {
      saveCurrentSession();
    }
  }, [messages, currentSessionId]);

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

  async function send(textOverride) {
    const text = (typeof textOverride === 'string' ? textOverride : input).trim();
    if (!text) return;
    
    // Check if working directory is selected
    if (!cwd) {
      alert('Please select a working directory first using the "Change" button above.');
      return;
    }
    
    // Check if already busy
    if (busy) {
      console.warn('Already processing a request, ignoring new input');
      return;
    }
    
    if (typeof textOverride !== 'string') setInput('');
    // Reset textarea height
    const textarea = document.querySelector('.input textarea');
    if (textarea) {
      textarea.style.height = '64px';
    }
    
    // Reset tool call indicator visibility for new conversation
    setHideToolCallIndicators(false);
    
    // Add user message
    setMessages(m => [...m, { who: 'user', text, rawData: { command: text, timestamp: Date.now() } }]);
    setBusy(true);
    
    try {
      // Prepare streaming message and subscribe to logs for this run
      const runId = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
      runIdRef.current = runId;
      
      // Create streaming assistant message
      let streamIdx;
      setMessages(m => {
        streamIdx = m.length;
        streamIndexRef.current = streamIdx;
        return [...m, { who: 'assistant', text: '', isStreaming: true, rawData: null }];
      });
      
      // Track accumulated assistant text
      let accumulatedText = '';
      
      // Subscribe to log stream for this run
      unsubRef.current = window.cursovable.onCursorLog(async (payload) => {
        if (!payload || payload.runId !== runIdRef.current) {
          return;
        }
        
        try {
          // Parse each line as JSON
          const lines = payload.line.split('\n').filter(line => line.trim());
          
          for (const line of lines) {
            try {
              const parsed = JSON.parse(line);
              console.log('Parsed log line:', parsed);
              
              // Handle assistant messages - accumulate text content
              if (parsed.type === 'assistant' && parsed.message && parsed.message.content) {
                for (const content of parsed.message.content) {
                  if (content.type === 'text' && content.text) {
                    accumulatedText += content.text;
                    
                    // Update the streaming message with accumulated text
                    setMessages(m => {
                      const idx = streamIndexRef.current;
                      if (idx >= 0 && idx < m.length) {
                        const updated = [...m];
                        updated[idx] = { ...updated[idx], text: accumulatedText, isStreaming: true };
                        return updated;
                      }
                      return m;
                    });
                    
                    // Add a small delay for more organic typing feel
                    await new Promise(resolve => setTimeout(resolve, 20));
                  }
                }
              }
              
              // Extract session ID from cursor-agent response and update session if needed
              if (parsed.session_id && parsed.session_id !== currentSessionId) {
                // Update the current session with the session ID from cursor-agent
                const currentSession = sessions.find(s => s.id === currentSessionId);
                if (currentSession) {
                  const updatedSessions = sessions.map(session => 
                    session.id === currentSessionId 
                      ? { ...session, cursorSessionId: parsed.session_id, updatedAt: Date.now() }
                      : session
                  );
                  setSessions(updatedSessions);
                  saveSessions(updatedSessions);
                  
                  console.log(`Session ${currentSessionId} linked to cursor-agent session: ${parsed.session_id}`);
                }
              }
              
              // Handle tool calls
              if (parsed.type === 'tool_call') {
                const callId = parsed.call_id;
                const toolCallData = parsed.tool_call;
                
                console.log('Tool call received:', { callId, subtype: parsed.subtype, toolCallData });
                
                // Store tool call info
                setToolCalls(prev => {
                  const newMap = new Map(prev);
                  const existing = newMap.get(callId);
                  
                  console.log('Storing tool call:', { callId, subtype: parsed.subtype, existing: !!existing });
                  
                  if (existing) {
                    // Update existing tool call
                    newMap.set(callId, {
                      ...existing,
                      toolCall: toolCallData, // Update with latest tool call data
                      isCompleted: parsed.subtype === 'completed',
                      isStarted: parsed.subtype === 'started',
                      completedAt: parsed.subtype === 'completed' ? Date.now() : existing.completedAt,
                      rawData: parsed, // Store the complete raw JSON
                      lastUpdated: Date.now() // Track when this was last updated
                    });
                  } else {
                    // Create new tool call entry
                    newMap.set(callId, {
                      toolCall: toolCallData,
                      isCompleted: parsed.subtype === 'completed',
                      isStarted: parsed.subtype === 'started',
                      startedAt: Date.now(),
                      completedAt: parsed.subtype === 'completed' ? Date.now() : null,
                      rawData: parsed, // Store the complete raw JSON
                      lastUpdated: Date.now() // Track when this was last updated
                    });
                  }
                  
                  console.log('Tool calls after update:', newMap.size);
                  return newMap;
                });
                
              }
              
              // Stop streaming when we get a result
              if (parsed.type === 'result') {
                // Mark all active tool calls as completed
                setToolCalls(prev => {
                  const newMap = new Map();
                  for (const [callId, toolCallInfo] of prev.entries()) {
                    newMap.set(callId, {
                      ...toolCallInfo,
                      isCompleted: true,
                      completedAt: Date.now(),
                      lastUpdated: Date.now()
                    });
                  }
                  return newMap;
                });
                  
                  // Hide tool call indicators after result
                  setHideToolCallIndicators(true);
                  
                  // Mark the streaming message as complete
                  if (accumulatedText.trim()) {
                    setMessages(m => {
                      const idx = streamIndexRef.current;
                      if (idx >= 0 && idx < m.length) {
                        const updated = [...m];
                        updated[idx] = { ...updated[idx], isStreaming: false };
                        return updated;
                      }
                      return m;
                    });
                    
                    // Create a new bubble with the final result message
                    setMessages(m => {
                      const newMessages = [...m, { 
                        who: 'assistant', 
                        text: `**Command completed successfully!**\n\n${accumulatedText}`,
                        isStreaming: false,
                        rawData: { result: 'success', text: accumulatedText },
                        showActionLog: true // Flag to show action log
                      }];
                      
                      // Scroll to the new message after a brief delay to ensure it's rendered
                      setTimeout(() => {
                        if (scroller.current) {
                          scroller.current.scrollTop = scroller.current.scrollHeight;
                        }
                      }, 100);
                      
                      return newMessages;
                    });

                    // After first response: try installing packages then auto-run preview
                    try {
                      const status = await window.cursovable.getWorkingDirectory();
                      const cwdPath = status || (typeof cwd === 'string' ? cwd : null);
                      if (cwdPath) {
                        try {
                          await window.cursovable.installPackages({ folderPath: cwdPath, manager: 'yarn' });
                        } catch (e) {
                          console.warn('Auto install failed:', e);
                        }
                      }
                    } catch (e) {
                      console.warn('Working directory lookup failed:', e);
                    }
                  } else {
                    // If we didn't get any assistant content, show a fallback message
                    setMessages(m => {
                      const idx = streamIndexRef.current;
                      if (idx >= 0 && idx < m.length) {
                        const updated = [...m];
                        updated[idx] = { ...updated[idx], text: 'No response content received from cursor-agent.', isStreaming: false, rawData: { error: 'No response content' } };
                        return updated;
                      }
                      return m;
                    });
                  }
                  
                  // Clean up streaming state and allow new input
                  if (unsubRef.current) { 
                    try { unsubRef.current(); } catch {} 
                    unsubRef.current = null; 
                  }
                  streamIndexRef.current = -1;
                  runIdRef.current = null;
                  setBusy(false);
                  
                  return;
                }
            } catch (parseError) {
              // This line is not valid JSON - check if it's our end marker
              if (line.includes('123[*****END*****]123')) {
                // Mark all active tool calls as completed
                setToolCalls(prev => {
                  const newMap = new Map();
                  for (const [callId, toolCallInfo] of prev.entries()) {
                    newMap.set(callId, {
                      ...toolCallInfo,
                      isCompleted: true,
                      completedAt: Date.now(),
                      lastUpdated: Date.now()
                    });
                  }
                  return newMap;
                });
                
                // Hide tool call indicators after result
                setHideToolCallIndicators(true);
                
                // Mark the streaming message as complete
                if (accumulatedText.trim()) {
                  setMessages(m => {
                    const idx = streamIndexRef.current;
                    if (idx >= 0 && idx < m.length) {
                      const updated = [...m];
                      updated[idx] = { ...updated[idx], isStreaming: false };
                      return updated;
                    }
                    return m;
                  });
                  
                  // Create a new bubble with the final result message
                  setMessages(m => {
                    const newMessages = [...m, { 
                      who: 'assistant', 
                      text: `**Command completed successfully!**\n\n${accumulatedText}`,
                      isStreaming: false,
                      rawData: { result: 'success', text: accumulatedText },
                      showActionLog: true // Flag to show action log
                    }];
                    
                    // Scroll to the new message after a brief delay to ensure it's rendered
                    setTimeout(() => {
                      if (scroller.current) {
                        scroller.current.scrollTop = scroller.current.scrollHeight;
                      }
                    }, 100);
                    
                    return newMessages;
                  });
                } else {
                  // If we didn't get any assistant content, show a fallback message
                  setMessages(m => {
                    const idx = streamIndexRef.current;
                    if (idx >= 0 && idx < m.length) {
                      const updated = [...m];
                      updated[idx] = { ...updated[idx], text: 'No response content received from cursor-agent.', isStreaming: false, rawData: { error: 'No response content' } };
                      return updated;
                    }
                    return m;
                  });
                }
                
                // Clean up streaming state and allow new input
                if (unsubRef.current) { 
                  try { unsubRef.current(); } catch {} 
                  unsubRef.current = null; 
                }
                streamIndexRef.current = -1;
                runIdRef.current = null;
                setBusy(false);
                
                return;
              }
              
              // Skip other lines that aren't valid JSON
              continue;
            }
          }
        } catch (error) {
          console.error('Error processing log line:', error);
        }
      });

      // Use cursor-agent session ID if available, otherwise use our internal session ID
      const currentSession = sessions.find(s => s.id === currentSessionId);
      const sessionIdToUse = currentSession?.cursorSessionId || currentSessionId;

      const res = await window.cursovable.runCursor({ 
        message: text, 
        cwd: cwd || undefined, 
        runId,
        sessionId: sessionIdToUse
      });
      
      // We just need to ensure the process completed successfully
      if (res.type === 'error') {
        throw new Error(res.error || 'Unknown error occurred');
      }
      
      // Log successful response for debugging
      console.log('runCursor completed successfully:', res);
      
      // Fallback: If we're still streaming after runCursor completes, assume it's done
      if (streamIndexRef.current >= 0 && accumulatedText.trim()) {
        // Mark all active tool calls as completed
        setToolCalls(prev => {
          const newMap = new Map();
          for (const [callId, toolCallInfo] of prev.entries()) {
            newMap.set(callId, {
              ...toolCallInfo,
              isCompleted: true,
              completedAt: Date.now(),
              lastUpdated: Date.now()
            });
          }
          return newMap;
        });
        
        // Hide tool call indicators after result
        setHideToolCallIndicators(true);
        
        // Mark streaming as complete
        setMessages(m => {
          const idx = streamIndexRef.current;
          if (idx >= 0 && idx < m.length) {
            const updated = [...m];
            updated[idx] = { ...updated[idx], isStreaming: false };
            return updated;
          }
          return m;
        });
        
        // Create completion message if we have content
        if (accumulatedText.trim()) {
          setMessages(m => [...m, { 
            who: 'assistant', 
            text: `**Command completed:**\n\n${accumulatedText}`,
            isStreaming: false,
            rawData: { result: 'completed', text: accumulatedText },
            showActionLog: true // Flag to show action log
          }]);
        }
        
        // Clean up streaming state and allow new input
        if (unsubRef.current) { 
          try { unsubRef.current(); } catch {} 
          unsubRef.current = null; 
        }
        streamIndexRef.current = -1;
        runIdRef.current = null;
        setBusy(false);
      }
    } catch (e) {
      // Check if it's a terminal-related error
      let errorMessage = e.message || String(e);
      if (errorMessage.includes('timeout') || errorMessage.includes('idle')) {
        errorMessage = `**Terminal timeout detected:** ${errorMessage}\n\nThis usually means the cursor-agent process hung or is waiting for input. Try:\n\n1. **Force Cleanup** button above to kill stuck processes\n2. Check if cursor-agent needs interactive input\n3. Restart the application if the issue persists`;
      } else if (errorMessage.includes('cursor-agent')) {
        errorMessage = `**Cursor agent error:** ${errorMessage}\n\nCheck if cursor-agent is properly installed and accessible.`;
      } else if (errorMessage.includes('SIGTERM') || errorMessage.includes('killed')) {
        errorMessage = `**Process terminated:** ${errorMessage}\n\nThis usually means the process was killed due to timeout or cleanup. This is normal behavior.`;
      }
      
      // Render error in the streaming bubble if available
      setMessages(m => {
        const idx = streamIndexRef.current;
        const text = errorMessage;
        if (idx >= 0 && idx < m.length) {
          const updated = [...m];
          updated[idx] = { who: 'assistant', text, isStreaming: false, rawData: { error: errorMessage } };
          return updated;
        }
        return [...m, { who: 'assistant', text, isStreaming: false, rawData: { error: errorMessage } }];
      });
      
      // Update terminal status after error
      await checkTerminalStatus();
    } finally {
      // Clean up streaming state
      if (unsubRef.current) { try { unsubRef.current(); } catch {} unsubRef.current = null; }
      streamIndexRef.current = -1;
      runIdRef.current = null;
      setBusy(false);
    }
  }

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
      {/* Session management header */}
      <div style={{
        padding: '8px 12px',
        margin: '8px 0',
        backgroundColor: '#0b1018',
        borderRadius: '8px',
        fontSize: '12px',
        border: '1px solid #1d2633',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        color: '#e6e6e6',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: '500', color: '#3c6df0' }}>
            💬 {sessions.find(s => s.id === currentSessionId)?.name || 'No Session'}
          </span>
          {currentSessionId && isSessionWithFirstUserMessage(sessions.find(s => s.id === currentSessionId)) && (
            <span 
              style={{ 
                fontSize: '9px', 
                color: '#fbbf24',
                fontWeight: 'bold',
                background: 'rgba(251, 191, 36, 0.1)',
                padding: '2px 5px',
                borderRadius: '8px',
                border: '1px solid rgba(251, 191, 36, 0.3)'
              }}
              title="This session contains the first user message for this project"
            >
              1st MESSAGE
            </span>
          )}
          <span style={{ fontSize: '10px', opacity: 0.7 }}>
            ({sessions.length} total)
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={() => setShowSearch(!showSearch)}
            style={{
              fontSize: '11px',
              padding: '4px 8px',
              backgroundColor: showSearch ? '#3c6df0' : '#374151',
              color: '#e6e6e6',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
            title="Search messages"
          >
            🔍
          </button>
          <button
            onClick={() => setShowSessionList(!showSessionList)}
            style={{
              fontSize: '11px',
              padding: '4px 8px',
              backgroundColor: showSessionList ? '#3c6df0' : '#374151',
              color: '#e6e6e6',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
            title="Session history"
          >
            📚
          </button>
          {getFirstUserMessageSession() && (
            <button
              onClick={goToFirstUserMessageSession}
              style={{
                fontSize: '11px',
                padding: '4px 8px',
                backgroundColor: '#fbbf24',
                color: '#111827',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
              title="Go to session with first user message"
            >
              1st
            </button>
          )}
          <button
            onClick={() => setIsCreatingNewSession(true)}
            style={{
              fontSize: '11px',
              padding: '4px 8px',
              backgroundColor: '#10b981',
              color: '#e6e6e6',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
            title="New session"
          >
            ➕
          </button>
        </div>
      </div>

      {/* Session list UI */}
      {showSessionList && (
        <div style={{
          padding: '12px',
          margin: '8px 0',
          backgroundColor: '#0b1018',
          borderRadius: '8px',
          border: '1px solid #1d2633',
          maxHeight: '300px',
          overflowY: 'auto'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
            paddingBottom: '8px',
            borderBottom: '1px solid #1d2633'
          }}>
            <h3 style={{ 
              margin: 0, 
              fontSize: '14px', 
              color: '#3c6df0',
              fontWeight: '600'
            }}>
              Session History
            </h3>
            <button
              onClick={() => createNewSession()}
              style={{
                fontSize: '12px',
                padding: '6px 12px',
                backgroundColor: '#10b981',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              + New Session
            </button>
          </div>
          
          {sessions.length === 0 ? (
            <div style={{
              textAlign: 'center',
              color: '#6b7280',
              fontSize: '12px',
              padding: '20px'
            }}>
              No sessions yet. Create your first session!
            </div>
          ) : (
            sessions
              .sort((a, b) => {
                // First, prioritize the session with the first user message
                const aIsFirst = isSessionWithFirstUserMessage(a);
                const bIsFirst = isSessionWithFirstUserMessage(b);
                if (aIsFirst && !bIsFirst) return -1;
                if (!aIsFirst && bIsFirst) return 1;
                
                // Then sort by most recent update
                return b.updatedAt - a.updatedAt;
              })
              .map(session => (
                <div
                  key={session.id}
                  style={{
                    padding: '8px 12px',
                    margin: '4px 0',
                    backgroundColor: session.id === currentSessionId ? '#1a2331' : '#111827',
                    border: session.id === currentSessionId ? '1px solid #3c6df0' : '1px solid #374151',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => {
                    if (session.id !== currentSessionId) {
                      loadSession(session.id);
                      setShowSessionList(false);
                    }
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: '12px',
                      color: session.id === currentSessionId ? '#3c6df0' : '#e6e6e6',
                      fontWeight: session.id === currentSessionId ? '600' : '400',
                      marginBottom: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      {session.name}
                      {isSessionWithFirstUserMessage(session) && (
                        <span 
                          style={{ 
                            fontSize: '10px', 
                            color: '#fbbf24',
                            fontWeight: 'bold',
                            background: 'rgba(251, 191, 36, 0.1)',
                            padding: '2px 6px',
                            borderRadius: '10px',
                            border: '1px solid rgba(251, 191, 36, 0.3)'
                          }}
                          title="This session contains the first user message for this project"
                        >
                          1st
                        </span>
                      )}
                    </div>
                    <div style={{
                      fontSize: '10px',
                      color: '#6b7280',
                      display: 'flex',
                      gap: '8px'
                    }}>
                      <span>{(session.messages || []).length} messages</span>
                      <span>•</span>
                      <span>{new Date(session.updatedAt).toLocaleString()}</span>
                      {session.cursorSessionId && (
                        <>
                          <span>•</span>
                          <span style={{ color: '#10b981' }} title={`Linked to cursor-agent session: ${session.cursorSessionId}`}>🔗</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {session.id === currentSessionId && (
                    <span style={{
                      fontSize: '10px',
                      color: '#10b981',
                      fontWeight: '600',
                      marginRight: '8px'
                    }}>
                      ACTIVE
                    </span>
                  )}
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete session "${session.name}"? This cannot be undone.`)) {
                        deleteSession(session.id);
                      }
                    }}
                    style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      backgroundColor: '#ef4444',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer'
                    }}
                    title="Delete session"
                  >
                    🗑️
                  </button>
                </div>
              ))
          )}
        </div>
      )}
      
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
        {filteredMessages.length === 0 && searchQuery ? (
          <div style={{
            padding: '20px',
            textAlign: 'center',
            color: '#6b7280',
            fontSize: '14px'
          }}>
            🔍 No messages found matching "{searchQuery}"
          </div>
        ) : filteredMessages.length === 0 ? (
          <div style={{
            padding: '20px',
            textAlign: 'center',
            color: '#6b7280',
            fontSize: '14px'
          }}>
            💬 Start a conversation by typing a message below
          </div>
        ) : (
          filteredMessages.map((m, i) => (
                        <Bubble 
              key={i} 
              who={m.who} 
              isStreaming={m.isStreaming} 
              rawData={m.rawData}
              showActionLog={m.showActionLog}
              toolCalls={m.showActionLog ? toolCalls : null}
              searchQuery={searchQuery}
            >
              {m.text}
            </Bubble>
          ))
        )}
        
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
        
        {/* Debug: Show tool call count - Only show while conversation is active */}
        {!hideToolCallIndicators && toolCalls.size > 0 && (
          <div style={{ 
            fontSize: '10px', 
            color: '#6b7280', 
            padding: '8px 12px',
            fontFamily: 'monospace',
            background: 'rgba(15, 23, 42, 0.8)',
            borderRadius: '8px',
            border: '1px solid #374151',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            animation: 'fadeInUp 0.3s ease-out',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
          }}>
            <span style={{ 
              background: '#3c6df0', 
              color: 'white', 
              borderRadius: '50%', 
              width: '18px', 
              height: '18px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontSize: '9px',
              fontWeight: 'bold',
              animation: toolCalls.size > 0 ? 'pulse 2s ease-in-out infinite' : 'none'
            }}>
              {toolCalls.size}
            </span>
            <span style={{ fontWeight: '500' }}>Active Tools</span>
            <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '8px' }}>✓</span>
              {Array.from(toolCalls.values()).filter(t => t.isCompleted).length}
            </span>
            <span style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '8px' }}>⚡</span>
              {Array.from(toolCalls.values()).filter(t => !t.isCompleted).length}
            </span>
          </div>
        )}
      </div>
      
      {/* Message counter and status */}
      <div style={{
        padding: '8px 12px',
        margin: '8px 0',
        backgroundColor: '#0b1018',
        borderRadius: '4px',
        fontSize: '11px',
        fontFamily: 'monospace',
        border: '1px solid #1d2633',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        color: '#6b7280'
      }}>
        <span>
          💬 {messages.length} message{messages.length !== 1 ? 's' : ''} 
          {searchQuery && ` • ${filteredMessages.length} filtered`}
        </span>
        <span>
          ⚡ {Array.from(toolCalls.values()).filter(t => !t.isCompleted).length} active tools
        </span>
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
      
      <form className="input" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <div className="input-field" style={{ position: 'relative', width: '100%' }}>
          <textarea
            placeholder={!cwd ? 'Please select a working directory first...' : 'Ask the CTO agent…'}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              // Auto-resize textarea
              const textarea = e.target;
              textarea.style.height = 'auto';
              textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
                return;
              }
              // Handle Ctrl+C for copying selected text
              if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
                const selection = e.target.value.substring(e.target.selectionStart, e.target.selectionEnd);
                if (selection) {
                  e.preventDefault();
                  navigator.clipboard.writeText(selection);
                }
              }
            }}
            disabled={!cwd}
            style={{ height: '64px' }}
            className="copyable-text"
            aria-label="Type your message to the CTO agent"
          />
          {/* Keyboard shortcut hint */}
          <div className="shortcut-hint">Enter to send • Shift+Enter for newline</div>
        </div>
        <button 
          disabled={busy || !cwd} 
          className="send-button"
          style={{ opacity: !cwd ? 0.5 : 1 }}
          aria-label={!cwd ? 'Select working directory first' : busy ? 'Processing request...' : 'Send message'}
          title={!cwd ? 'Select working directory first' : busy ? 'Processing request...' : 'Send message'}
          type="submit"
        >
          {!cwd ? 'Select Directory First' : busy ? '⏳' : '➤ Send'}
        </button>
      </form>
    </>
  );
}
