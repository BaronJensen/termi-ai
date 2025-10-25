import { useState, useEffect, useCallback, useRef } from 'react';
import { useMessageHandler } from './useMessageHandler';
import { loadSettings } from '../../../store/settings';
import { getProject } from '../../../store/projects';

export const useSessionManager = (projectId) => {
  console.log('🔍 useSessionManager hook initialized with projectId:', projectId);
  
  // Core session state
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  
  // Session-specific state maps
  const [busyBySession, setBusyBySession] = useState(new Map());
  const [toolCallsBySession, setToolCallsBySession] = useState(new Map());
  const [hideToolCallIndicatorsBySession, setHideToolCallIndicatorsBySession] = useState(new Map());
  const [streamingTextBySession, setStreamingTextBySession] = useState(new Map());
  const [terminalLogs, setTerminalLogs] = useState(new Map());
  const [showRawTerminal, setShowRawTerminal] = useState(new Map());
  const [visibleTerminals, setVisibleTerminals] = useState(new Set()); // Track which terminals are visible
  const [deferredMessages, setDeferredMessages] = useState(new Map()); // Store messages to be sent later
  
  // Track if we've already initialized to prevent overriding manual session selection
  const hasInitializedRef = useRef(false);

  // ===== STORAGE MANAGEMENT =====
  
  const loadSessions = useCallback(() => {
    try {
      const storedSessions = localStorage.getItem(`termi-ai-sessions-${projectId || 'legacy'}`);
      if (storedSessions) {
        const parsedSessions = JSON.parse(storedSessions);
        console.log(`🔍 loadSessions: Loaded ${parsedSessions.length} sessions from localStorage:`, 
          parsedSessions.map(s => ({ id: s.id, name: s.name, cursorSessionId: s.cursorSessionId })));
        return Array.isArray(parsedSessions) ? parsedSessions : [];
      }
    } catch (e) {
      console.warn('Failed to load sessions from localStorage:', e);
    }
    return [];
  }, [projectId]);

  const saveSessions = useCallback((sessionsToSave) => {
    try {
      localStorage.setItem(`termi-ai-sessions-${projectId || 'legacy'}`, JSON.stringify(sessionsToSave));
    } catch (error) {
      console.warn('Failed to save sessions to localStorage:', error);
    }
  }, [projectId]);

  // ===== SESSION STATE HELPERS =====
  
  const isSessionBusy = useCallback((sessionId) => {
    return busyBySession.get(sessionId) || false;
  }, [busyBySession]);

  const setSessionBusy = useCallback((sessionId, isBusy = true) => {
    setBusyBySession(prev => {
      const next = new Map(prev);
      if (isBusy) {
        next.set(sessionId, true);
        // Show terminal when session becomes busy
        setVisibleTerminals(prev => new Set([...prev, sessionId]));
      } else {
        next.delete(sessionId);
      }
      return next;
    });
  }, []);

  // Show terminal for a session
  const showTerminal = useCallback((sessionId) => {
    setVisibleTerminals(prev => new Set([...prev, sessionId]));
  }, []);

  // Hide terminal for a session (but don't delete the session)
  const hideTerminal = useCallback((sessionId) => {
    setVisibleTerminals(prev => {
      const next = new Set(prev);
      next.delete(sessionId);
      return next;
    });
  }, []);

  // Check if terminal is visible for a session
  const isTerminalVisible = useCallback((sessionId) => {
    return visibleTerminals.has(sessionId);
  }, [visibleTerminals]);

  const getCurrentSessionBusy = useCallback(() => {
    if (!currentSessionId) {
      console.warn('getCurrentSessionBusy called with null currentSessionId');
      return false;
    }
    return isSessionBusy(currentSessionId);
  }, [currentSessionId, isSessionBusy]);

  const getSessionToolCalls = useCallback((sessionId) => {
    const toolCalls = toolCallsBySession.get(sessionId);
    return toolCalls instanceof Map ? toolCalls : new Map();
  }, [toolCallsBySession]);

  const setSessionToolCalls = useCallback((sessionId, toolCalls) => {
    console.log(`🔧 setSessionToolCalls called with sessionId: ${sessionId}, toolCalls:`, toolCalls);
    console.log(`🔧 Session ID type: ${typeof sessionId}, value: ${sessionId}`);
    
    setToolCallsBySession(prev => {
      console.log(`🔧 Previous toolCallsBySession:`, prev);
      const next = new Map(prev);
      next.set(sessionId, toolCalls);
      console.log(`🔧 Updated toolCallsBySession:`, next);
      return next;
    });
  }, []);

  const getCurrentSessionToolCalls = useCallback(() => {
    if (!currentSessionId) {
      console.warn('getCurrentSessionToolCalls called with null currentSessionId');
      return new Map();
    }
    const toolCalls = getSessionToolCalls(currentSessionId);
    console.log(`🔧 getCurrentSessionToolCalls for session ${currentSessionId}:`, toolCalls);
    return toolCalls instanceof Map ? toolCalls : new Map();
  }, [currentSessionId, getSessionToolCalls]);

  const getSessionHideToolCallIndicators = useCallback((sessionId) => {
    return hideToolCallIndicatorsBySession.get(sessionId) || false;
  }, [hideToolCallIndicatorsBySession]);

  const setSessionHideToolCallIndicators = useCallback((sessionId, hide) => {
    setHideToolCallIndicatorsBySession(prev => {
      const next = new Map(prev);
      next.set(sessionId, hide);
      return next;
    });
  }, []);

  const getCurrentSessionHideToolCallIndicators = useCallback(() => {
    if (!currentSessionId) {
      console.warn('getCurrentSessionHideToolCallIndicators called with null currentSessionId');
      return false;
    }
    return getSessionHideToolCallIndicators(currentSessionId);
  }, [currentSessionId, getSessionHideToolCallIndicators]);

  // Streaming text management
  const getSessionStreamingText = useCallback((sessionId) => {
    return streamingTextBySession.get(sessionId) || '';
  }, [streamingTextBySession]);

  const setSessionStreamingText = useCallback((sessionId, text) => {
    setStreamingTextBySession(prev => {
      const next = new Map(prev);
      if (typeof text === 'function') {
        // Handle function-based updates (for accumulation)
        const currentText = next.get(sessionId) || '';
        next.set(sessionId, text(currentText));
      } else {
        // Handle direct value updates
        next.set(sessionId, text);
      }
      return next;
    });
  }, []);

  const getCurrentSessionStreamingText = useCallback(() => {
    if (!currentSessionId) {
      console.warn('getCurrentSessionStreamingText called with null currentSessionId');
      return '';
    }
    return getSessionStreamingText(currentSessionId);
  }, [currentSessionId, getSessionStreamingText]);

  // ===== SESSION MANAGEMENT =====
  
  const createNewSession = useCallback(async (existingSessions = null, initialMessage = null, provider = null) => {
    const currentSessions = existingSessions || sessions;
    const newSessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    const isFirstSession = currentSessions.length === 0;

    // Get default provider from settings if not specified
    const settings = loadSettings();
    const sessionProvider = provider || settings.defaultProvider || 'cursor';

    const newSession = {
      id: newSessionId,
      name: `Session ${new Date().toLocaleString()}`,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isFirstSession: isFirstSession,
      cursorSessionId: null,
      runningTerminal: false,
      provider: sessionProvider,  // NEW: Track which provider this session uses
      providerId: null            // NEW: Provider-specific session ID
    };
    
    const updatedSessions = [...currentSessions, newSession];
    setSessions(updatedSessions);
    saveSessions(updatedSessions);
    setCurrentSessionId(newSessionId);
    
    // Initialize state for new session
    setToolCallsBySession(prev => {
      const next = new Map(prev);
      next.set(newSessionId, new Map());
      return next;
    });
    setHideToolCallIndicatorsBySession(prev => {
      const next = new Map(prev);
      next.set(newSessionId, false);
      return next;
    });
    setStreamingTextBySession(prev => {
      const next = new Map(prev);
      next.set(newSessionId, '');
      return next;
    });
    setTerminalLogs(prev => {
      const next = new Map(prev);
      next.set(newSessionId, { cursor: [] });
      return next;
    });
    setShowRawTerminal(prev => {
      const next = new Map(prev);
      next.set(newSessionId, false);
      return next;
    });
    
    console.log(`Created new session: ${newSessionId} (${newSession.name})`);
    
    // If an initial message is provided, store it for later sending
    if (initialMessage) {
      console.log(`🚀 Storing initial message for new session: "${initialMessage}"`);
      // Store the message in the session for later processing
      const userMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
        who: 'user',
        text: initialMessage,
        timestamp: Date.now()
      };
      
      // Add the message to the session
      setSessions(prevSessions => {
        const updatedSessions = prevSessions.map(session => 
          session.id === newSessionId 
            ? { 
                ...session, 
                messages: [...(session.messages || []), userMessage],
                updatedAt: Date.now() 
              }
            : session
        );
        saveSessions(updatedSessions);
        return updatedSessions;
      });
      
      // Mark session as busy to indicate it needs processing
      setSessionBusy(newSessionId, true);
    }
    
    return newSessionId;
  }, [sessions, saveSessions, setSessionBusy]);

  const loadSession = useCallback((sessionId) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      console.log(`Loading session ${sessionId} with ${session.messages?.length || 0} messages`);
      setCurrentSessionId(sessionId);
      
      // Show terminal if session has logs
      const sessionLogs = terminalLogs.get(sessionId);
      if (sessionLogs?.cursor?.length > 0) {
        setVisibleTerminals(prev => new Set([...prev, sessionId]));
      }
      
      console.log(`Switched to session ${sessionId} (other sessions remain active)`);
    } else {
      console.warn(`Session ${sessionId} not found in current sessions`);
    }
  }, [sessions, terminalLogs]);

  const deleteSession = useCallback((sessionId) => {
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
    
    // Clean up session state
    setToolCallsBySession(prev => {
      const next = new Map(prev);
      next.delete(sessionId);
      return next;
    });
    setHideToolCallIndicatorsBySession(prev => {
      const next = new Map(prev);
      next.delete(sessionId);
      return next;
    });
    setStreamingTextBySession(prev => {
      const next = new Map(prev);
      next.delete(sessionId);
      return next;
    });
    setTerminalLogs(prev => {
      const next = new Map(prev);
      next.delete(sessionId);
      return next;
    });
    setShowRawTerminal(prev => {
      const next = new Map(prev);
      next.delete(sessionId);
      return next;
    });
  }, [sessions, currentSessionId, saveSessions, loadSession, createNewSession]);

  const markSessionRunningTerminal = useCallback((sessionId) => {
    console.log(`🔄 markSessionRunningTerminal called for session: ${sessionId}`);
    
    setSessions(prevSessions => {
      // Mark all sessions as not running terminal
      const updatedSessions = prevSessions.map(session => ({
        ...session,
        runningTerminal: false
      }));
      
      // Mark the specified session as running terminal
      const targetSession = updatedSessions.find(s => s.id === sessionId);
      if (targetSession) {
        targetSession.runningTerminal = true;
        console.log(`✅ Marked session ${sessionId} as running terminal`);
      } else {
        console.warn(`❌ Session ${sessionId} not found, cannot mark as running terminal`);
      }
      
      saveSessions(updatedSessions);
      return updatedSessions;
    });
  }, [saveSessions]);

  const updateSessionWithCursorId = useCallback((sessionId, cursorSessionId) => {
    console.log(`🔄 updateSessionWithCursorId called with sessionId: ${sessionId}, cursorSessionId: ${cursorSessionId}`);
    
    // Validate parameters
    if (sessionId === cursorSessionId) {
      console.warn(`⚠️  WARNING: sessionId and cursorSessionId are the same: ${sessionId}`);
    }
    
    setSessions(prevSessions => {
      let updatedSessions = [...prevSessions];
      
      if (sessionId) {
        // Update the specific session with the cursor session ID
        const existingSession = prevSessions.find(s => s.id === sessionId);
        if (existingSession) {
          updatedSessions = updatedSessions.map(session => 
            session.id === sessionId 
              ? { ...session, cursorSessionId, updatedAt: Date.now() }
              : session
          );
          console.log(`✅ Updated session ${sessionId} with cursor session ID: ${cursorSessionId}`);
        } else {
          console.warn(`❌ Session ${sessionId} not found, cannot update with cursor session ID`);
        }
      } else {
        // No sessionId provided - find the session running the terminal and update it
        const runningSession = prevSessions.find(s => s.runningTerminal);
        if (runningSession) {
          updatedSessions = updatedSessions.map(session => 
            session.id === runningSession.id 
              ? { ...session, cursorSessionId, updatedAt: Date.now() }
              : session
          );
          console.log(`✅ Updated running session ${runningSession.id} with cursor session ID: ${cursorSessionId}`);
        } else {
          // Fallback: update the current session
          const currentSession = prevSessions.find(s => s.id === currentSessionId);
          if (currentSession) {
            updatedSessions = updatedSessions.map(session => 
              session.id === currentSessionId 
                ? { ...session, cursorSessionId, updatedAt: Date.now() }
                : session
            );
            console.log(`✅ Updated current session ${currentSessionId} with cursor session ID: ${cursorSessionId}`);
          } else {
            // Create a new session if no suitable session found
            console.log(`🔄 Creating new session with cursor session ID: ${cursorSessionId}`);
            const newSession = {
              id: `session-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
              name: 'New Session',
              messages: [],
              cursorSessionId,
              runningTerminal: true,
              createdAt: Date.now(),
              updatedAt: Date.now()
            };
            updatedSessions.push(newSession);
            setCurrentSessionId(newSession.id);
            
            // Initialize state for the new session
            setToolCallsBySession(prev => {
              const next = new Map(prev);
              next.set(newSession.id, new Map());
              return next;
            });
            setHideToolCallIndicatorsBySession(prev => {
              const next = new Map(prev);
              next.set(newSession.id, false);
              return next;
            });
            setTerminalLogs(prev => {
              const next = new Map(prev);
              next.set(newSession.id, { cursor: [] });
              return next;
            });
            setShowRawTerminal(prev => {
              const next = new Map(prev);
              next.set(newSession.id, false);
              return next;
            });
            
            console.log(`Created new session ${newSession.id} with cursor session ID: ${cursorSessionId}`);
          }
        }
      }
      
      saveSessions(updatedSessions);
      return updatedSessions;
    });
  }, [sessions, currentSessionId, saveSessions]);

  // ===== MESSAGE HANDLING =====
  
  const deriveSessionNameFromMessage = useCallback((text) => {
    if (!text || typeof text !== 'string') return 'Untitled';
    // Trim, collapse whitespace, strip newlines
    let name = text.trim().replace(/\s+/g, ' ');
    // Remove markdown code fences/backticks that could bloat UI
    name = name.replace(/`{1,3}/g, '');
    // Limit length to avoid breaking UI
    const maxLen = 60;
    if (name.length > maxLen) name = name.slice(0, maxLen - 1) + '…';
    return name || 'Untitled';
  }, []);

  const saveCurrentSession = useCallback((messages) => {
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
      saveSessions(updatedSessions);
      return updatedSessions;
    });
  }, [currentSessionId, saveSessions, deriveSessionNameFromMessage]);

  // ===== TERMINAL COMMUNICATION =====

  const handleCursorLog = useCallback((payload) => {
    console.log('🔍 SessionProvider received cursor log:', payload);
    
    // Route the log to the appropriate handler based on runId
    if (window.termiAILogRouter) {
      window.termiAILogRouter.routeLog(payload);
    }
    
    // Handle terminal logs for display
    if (payload && (payload.cursorSessionId || payload.id)) {
      let targetSessionId = null;
      
      // First try to use id if available (most reliable - this is the internal session ID)
      if (payload.id) {
        targetSessionId = payload.id;
      } 
      
      if (targetSessionId) {
        setTerminalLogs(prev => {
          const next = new Map(prev);
          const sessionLogs = next.get(targetSessionId) || { cursor: [] };

          const newLog = {
            ...payload,
            ts: Date.now(),
            tss: new Date().toLocaleTimeString()
          };

          const updatedLogs = {
            ...sessionLogs,
            cursor: [...sessionLogs.cursor, newLog]
          };

          next.set(targetSessionId, updatedLogs);
          return next;
        });
      }
    }
  }, [sessions, currentSessionId]);

  // Get terminal log statistics for memory monitoring
  const getTerminalLogStats = useCallback(() => {
    console.log('🔍 getTerminalLogStats called, terminalLogs:', terminalLogs);
    const stats = {
      totalSessions: terminalLogs.size,
      totalLogs: 0,
      sessionDetails: {}
    };
    
    for (const [sessionId, logs] of terminalLogs.entries()) {
      const sessionLogCount = logs.cursor?.length || 0;
      stats.totalLogs += sessionLogCount;
      stats.sessionDetails[sessionId] = {
        logCount: sessionLogCount,
        hasLogs: sessionLogCount > 0
      };
    }
    
    console.log('🔍 getTerminalLogStats result:', stats);
    return stats;
  }, [terminalLogs]);

  // Clear terminal logs for a session to prevent memory overload
  const clearSessionTerminalLogs = useCallback((sessionId) => {
    setTerminalLogs(prev => {
      const next = new Map(prev);
      next.set(sessionId, { cursor: [] });
      console.log(`🧹 After clear - new terminalLogs:`, next);
      return next;
    });
  }, []);

  // Clear all terminal logs for all sessions (global cleanup)
  const clearAllTerminalLogs = useCallback(() => {
    setTerminalLogs(new Map());
    console.log(`🧹 After clear - terminalLogs reset to new Map`);
  }, []);

  // ===== CURSOR COMMAND EXECUTION =====
  
  const send = useCallback(async (text, fullSessionObj) => {
    
    if (!fullSessionObj || !fullSessionObj.id) {
      console.error(`❌ Cannot send message: invalid session object`, fullSessionObj);
      return;
    }
    
    const sessionId = fullSessionObj.id;
    
    // Add user message to the session
    const userMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      who: 'user',
      text: text,
      timestamp: Date.now()
    };
    
    setSessions(prevSessions => {
      const updatedSessions = prevSessions.map(session => 
        session.id === sessionId 
          ? { 
              ...session, 
              messages: [...(session.messages || []), userMessage],
              updatedAt: Date.now() 
            }
          : session
      );
      
      saveSessions(updatedSessions);
      return updatedSessions;
    });
    
    // Clear terminal logs for this session to prevent memory overload
    clearSessionTerminalLogs(sessionId);
    
    // Mark session as busy
    setSessionBusy(sessionId, true);
    
    // Generate unique run ID for this command
    const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    
    try {
      // Create session object for the runner
      const sessionObject = {
        id: sessionId,
        cursorSessionId: fullSessionObj.cursorSessionId || null,
        runId: runId,
        initiatedAt: Date.now()
      };
      
      // Register the session object in the log router
      if (window.termiAILogRouter) {
        const messageHandler = createMessageHandler(runId, sessionId);
        window.termiAILogRouter.registerHandler(runId, messageHandler, sessionObject);
      }
      
      // Get project information and settings
      const project = getProject(projectId);
      const settings = loadSettings();

      // Get provider for this session
      const provider = fullSessionObj.provider || settings.defaultProvider || 'cursor';

      // Get provider-specific API key and model
      const providerApiKey = settings.providerApiKeys?.[provider] ||
                            (provider === 'cursor' ? settings.apiKey : '');
      const providerModel = settings.providerModels?.[provider] ||
                           (provider === 'cursor' ? settings.defaultModel : '');

      // Call the agent with the session's provider
      const result = await window.termiAI.runAgent({
        provider: provider,
        message: text,
        sessionObject,
        cwd: project?.path || await window.termiAI.getWorkingDirectory(),
        apiKey: providerApiKey || undefined,
        model: providerModel || undefined,
        debugMode: false
      });
      
    } catch (error) {
      console.error(`❌ Error running cursor command for session: ${sessionId}:`, error);
      
      // Add error message to the session
      const errorMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
        who: 'assistant',
        text: `Error: ${error.message}`,
        timestamp: Date.now(),
        isError: true
      };
      
      setSessions(prevSessions => {
        const updatedSessions = prevSessions.map(session => 
          session.id === sessionId 
            ? { 
                ...session, 
                messages: [...(session.messages || []), errorMessage],
                updatedAt: Date.now() 
              }
            : session
        );
        saveSessions(updatedSessions);
        return updatedSessions;
      });
    } finally {
      // Mark session as not busy
      setSessionBusy(sessionId, false);
      
      // Clean up the handler after completion
      if (window.termiAILogRouter) {
        window.termiAILogRouter.unregisterHandler(runId);
      }
    }
  }, [sessions, saveSessions, setSessionBusy, updateSessionWithCursorId, clearSessionTerminalLogs]);

  // Helper function to add messages to sessions
  const addMessageToSession = useCallback((sessionId, message, replaceToolCalls = false) => {
    console.log(`📝 addMessageToSession called:`, {
      sessionId,
      messageType: message.who,
      isToolCall: message.isToolCall,
      replaceToolCalls,
      messageId: message.id
    });

    setSessions(prev => {
      const updated = prev.map(s => {
        if (s.id !== sessionId) return s;

        let newMessages = [...(s.messages || [])];
        const existingToolCallCount = newMessages.filter(msg => msg.isToolCall).length;

        if (replaceToolCalls && message.isToolCall) {
          // Remove any existing tool call messages and add the new one
          newMessages = newMessages.filter(msg => !msg.isToolCall);
          const removedCount = existingToolCallCount;
          console.log(`🧹 Replaced ${removedCount} existing tool call messages with new one:`, {
            sessionId,
            removedCount,
            newMessageId: message.id,
            newMessageText: message.text
          });
        }

        // Add the new message
        newMessages.push(message);

        return { ...s, messages: newMessages, updatedAt: Date.now() };
      });

      saveSessions(updated);
      return updated;
    });
  }, [saveSessions]);

  // Remove all tool call messages from a session
  const removeToolCallMessages = useCallback((sessionId) => {
    console.log(`🧹 Removing all tool call messages from session ${sessionId}`);

    setSessions(prev => {
      const updated = prev.map(s => {
        if (s.id !== sessionId) return s;

        const newMessages = (s.messages || []).filter(msg => !msg.isToolCall);
        const removedCount = (s.messages || []).length - newMessages.length;

        console.log(`🧹 Removed ${removedCount} tool call messages from session ${sessionId}`);

        return { ...s, messages: newMessages, updatedAt: Date.now() };
      });

      saveSessions(updated);
      return updated;
    });
  }, [saveSessions]);

  // Process deferred messages after send function is available
  const processDeferredMessages = useCallback(() => {
    if (deferredMessages.size === 0) return;
    
    console.log(`🚀 Processing ${deferredMessages.size} deferred messages`);
    console.log(`🚀 Send function available:`, typeof send === 'function');
    console.log(`🚀 Deferred messages:`, Array.from(deferredMessages.entries()));
    
    deferredMessages.forEach((message, sessionId) => {
      console.log(`🚀 Processing deferred message for session ${sessionId}: "${message}"`);
      
      // Find the session
      const session = sessions.find(s => s.id === sessionId);
      if (session) {
        console.log(`🚀 Found session, sending message:`, session);
        // Send the message using the send function
        send(message, session);
        
        // Remove from deferred messages
        setDeferredMessages(prev => {
          const next = new Map(prev);
          next.delete(sessionId);
          return next;
        });
      } else {
        console.warn(`Session ${sessionId} not found for deferred message`);
        // Remove from deferred messages
        setDeferredMessages(prev => {
          const next = new Map(prev);
          next.delete(sessionId);
          return next;
        });
      }
    });
  }, [deferredMessages, sessions, send]);

  // ===== INITIALIZATION =====
  // Check if this is a new project that needs auto-start
  const shouldAutoStartNewProject = useCallback(() => {
    // Check if we have a project ID and if it's a new project
    if (!projectId) return false;
    
    // Check if there are any existing sessions for this project
    const existingSessions = loadSessions();
    if (existingSessions.length > 0) return false;
    
    // Check if we have a project prompt in localStorage (set by Dashboard)
    try {
      const projectPrompt = localStorage.getItem(`termi-ai-new-project-${projectId}`);
      const projectTemplate = localStorage.getItem(`termi-ai-new-project-template-${projectId}`);
      
      console.log(`🔍 Checking for new project auto-start:`, {
        projectId,
        hasExistingSessions: existingSessions.length > 0,
        projectPrompt,
        projectTemplate,
        localStorageKeys: Object.keys(localStorage).filter(key => key.includes('termi-ai-new-project'))
      });
      
      if (projectPrompt) {
        console.log(`🚀 New project detected with prompt: "${projectPrompt}", template: ${projectTemplate}`);
        return { prompt: projectPrompt, template: projectTemplate };
      }
    } catch (e) {
      console.warn('Failed to check for new project prompt:', e);
    }
    
    return false;
  }, [projectId, loadSessions]);

  // Create a new session specifically for a new project with automatic initial message
  const createNewProjectSession = useCallback(async (projectPrompt, projectTemplate = null) => {
    console.log(`🚀 createNewProjectSession called with prompt: "${projectPrompt}", template: ${projectTemplate}`);
    
    // Build the initial message based on the project template and prompt
    let initialMessage = projectPrompt;
    
    if (projectTemplate) {
      // Enhance the prompt with template-specific instructions
      switch (projectTemplate) {
        case 'react-vite':
          initialMessage = `Creating a new React + Vite project. ${projectPrompt}\n\nPlease scaffold a complete React + Vite project with:\n- Proper project structure\n- Essential dependencies\n- Basic components and routing\n- Development scripts\n- README with setup instructions`;
          break;
        case 'vue-vite':
          initialMessage = `Creating a new Vue 3 + Vite project. ${projectPrompt}\n\nPlease scaffold a complete Vue 3 + Vite project with:\n- Proper project structure\n- Essential dependencies\n- Basic views and components\n- Development scripts\n- README with setup instructions`;
          break;
        case 'next':
          initialMessage = `Creating a new Next.js project. ${projectPrompt}\n\nPlease scaffold a complete Next.js project with:\n- App router structure\n- Essential dependencies\n- Basic pages and API routes\n- Development scripts\n- README with setup instructions`;
          break;
        case 'html':
          initialMessage = `Creating a new static HTML project. ${projectPrompt}\n\nPlease scaffold a complete static HTML project with:\n- Proper folder structure\n- HTML, CSS, and JavaScript files\n- Basic styling and functionality\n- Instructions for running locally`;
          break;
        default:
          initialMessage = `Creating a new project: ${projectPrompt}\n\nPlease scaffold a complete project with proper structure, dependencies, and setup instructions.`;
      }
    }
    
    console.log(`📝 Generated initial message: "${initialMessage}"`);
    
    // Create the new session with the initial message
    const sessionId = await createNewSession(null, initialMessage);
    
    // Mark this session as running terminal since it's a new project
    markSessionRunningTerminal(sessionId);
    
    // Store the initial message for later processing when send function is available
    setDeferredMessages(prev => {
      const next = new Map(prev);
      next.set(sessionId, initialMessage);
      return next;
    });
    
    console.log(`✅ New project session created and started: ${sessionId}`);
    return sessionId;
  }, [createNewSession, markSessionRunningTerminal]);
  
  useEffect(() => {
    // Only initialize once to prevent overriding manual session selection
    if (hasInitializedRef.current) {
      console.log('Sessions already initialized, skipping to preserve manual selection');
      return;
    }
    
    const loadedSessions = loadSessions();
    
    setSessions(loadedSessions);
    
    if (loadedSessions.length > 0) {
      // Only set currentSessionId if it's not already set (to allow manual session switching)
      if (!currentSessionId) {
        // Load the most recent session
        const latestSession = loadedSessions.reduce((latest, session) => 
          session.updatedAt > latest.updatedAt ? session : latest
        );
        console.log(`Loading latest session: ${latestSession.name} (${latestSession.id})`);
        setCurrentSessionId(latestSession.id);
      }
      
      // Initialize state for all sessions
      loadedSessions.forEach(session => {
        setToolCallsBySession(prev => {
          const next = new Map(prev);
          next.set(session.id, new Map());
          return next;
        });
        setHideToolCallIndicatorsBySession(prev => {
          const next = new Map(prev);
          next.set(session.id, false);
          return next;
        });
        setTerminalLogs(prev => {
          const next = new Map(prev);
          next.set(session.id, { cursor: [] });
          return next;
        });
        setShowRawTerminal(prev => {
          const next = new Map(prev);
          next.set(session.id, false);
          return next;
        });
      });
    } else {
      // Check if this is a new project that should auto-start
      const newProjectInfo = shouldAutoStartNewProject();
      
      if (newProjectInfo) {
        console.log('🚀 Auto-starting new project session');
        createNewProjectSession(newProjectInfo.prompt, newProjectInfo.template).then(() => {
          // Clean up the localStorage after starting
          try {
            localStorage.removeItem(`termi-ai-new-project-${projectId}`);
            localStorage.removeItem(`termi-ai-new-project-template-${projectId}`);
          } catch (e) {
            console.warn('Failed to cleanup new project localStorage:', e);
          }
        });
      } else {
        // Create a temporary session immediately for better UX
        console.log('No existing sessions found, creating temporary session');
        createNewSession();
      }
    }
    
    // Mark as initialized to prevent future overrides
    hasInitializedRef.current = true;
  }, [projectId, loadSessions, createNewSession, createNewProjectSession, shouldAutoStartNewProject, currentSessionId]);

  // Process deferred messages after send function is available
  useEffect(() => {
    if (deferredMessages.size > 0 && typeof send === 'function') {
      processDeferredMessages();
    }
  }, [deferredMessages, send, processDeferredMessages]);

  // ===== HOOK INITIALIZATIONS =====
  
  // Initialize the message handler hook
  const messageHandler = useMessageHandler(
    addMessageToSession,
    updateSessionWithCursorId,
    setSessionToolCalls,
    setSessionHideToolCallIndicators,
    setSessionBusy,
    setSessionStreamingText,
    removeToolCallMessages
  );
  

  // ===== TERMINAL COMMUNICATION =====
  
  // Set up the centralized log router
  const setupLogRouter = useCallback(() => {
    // Only set up if window.termiAI is available (Electron environment)
    if (!window.termiAI?.onCursorLog) {
      console.log('window.termiAI.onCursorLog not available, skipping log router setup');
      return null;
    }

    // Create the centralized log router
    const logRouter = {
      handlers: new Map(), // runId -> handler function
      runToSessionMap: new Map(), // runId -> session object mapping
      
      registerHandler(runId, handler, sessionObject) {
        console.log(`🔧 Log router: registered handler for runId ${runId} with session:`, sessionObject);
        this.handlers.set(runId, handler);
        this.runToSessionMap.set(runId, sessionObject);
      },
      
      unregisterHandler(runId) {
        console.log(`🔧 Log router: unregistered handler for runId ${runId}`);
        this.handlers.delete(runId);
        this.runToSessionMap.delete(runId);
      },
      
      getCurrentRunSession(runId) {
        const sessionObject = this.runToSessionMap.get(runId);
        return sessionObject;
      },
      
      getCurrentRunSessionId(runId) {
        const sessionObject = this.runToSessionMap.get(runId);
        return sessionObject?.id;
      },
      
      routeLog(payload) {
        console.log(`🔧 Log router: routing payload for runId ${payload?.runId}:`, {
          level: payload?.level,
          hasLine: !!payload?.line,
          linePreview: payload?.line?.substring(0, 100)
        });
        
        if (!payload || !payload.runId) {
          console.log('⚠️  Log router: payload missing runId, skipping');
          return;
        }
        
        const handler = this.handlers.get(payload.runId);
        if (handler) {
          try {
            handler(payload);
          } catch (error) {
            console.error(`❌ Log router: error in handler for runId ${payload.runId}:`, error);
          }
        } else {
          console.log(`⚠️  Log router: no handler found for runId ${payload.runId}`);
          console.log(`🔧 Available handlers:`, Array.from(this.handlers.keys()));
        }
      },
      
      debugState() {
        return {
          totalHandlers: this.handlers.size,
          registeredRunIds: Array.from(this.handlers.keys()),
          runToSessionMap: Array.from(this.runToSessionMap.entries()),
          sessions: sessions.map(s => ({ id: s.id, name: s.name, cursorSessionId: s.cursorSessionId })),
          currentSessionId
        };
      }
    };

    // Store the router globally
    window.termiAILogRouter = logRouter;
    return logRouter;
  }, [sessions, currentSessionId]);

  // Clean up the log router
  const cleanupLogRouter = useCallback(() => {
    if (window.termiAILogRouter) {
      window.termiAILogRouter.handlers.clear();
      delete window.termiAILogRouter;
    }
  }, []);

  // Get terminal status for a specific session
  const getSessionTerminalStatus = useCallback((sessionId) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return null;

    return {
      id: session.id,
      name: session.name,
      cursorSessionId: session.cursorSessionId,
      runningTerminal: session.runningTerminal || false,
      isActive: session.id === currentSessionId,
      hasCursorSession: !!session.cursorSessionId
    };
  }, [sessions, currentSessionId]);

  // Get terminal status for all sessions
  const getAllSessionsTerminalStatus = useCallback(() => {
    return sessions.map(session => getSessionTerminalStatus(session.id));
  }, [sessions, getSessionTerminalStatus]);

  // Get the current active terminal session
  const getCurrentTerminalSession = useCallback(() => {
    if (!currentSessionId) return null;
    return getSessionTerminalStatus(currentSessionId);
  }, [currentSessionId, getSessionTerminalStatus]);

  // Check if a session is currently running a terminal
  const isSessionRunningTerminal = useCallback((sessionId) => {
    const session = sessions.find(s => s.id === sessionId);
    return session?.runningTerminal || false;
  }, [sessions]);

  // Get cursor session ID for a given internal session
  const getCursorSessionId = useCallback((sessionId) => {
    const session = sessions.find(s => s.id === sessionId);
    return session?.cursorSessionId || null;
  }, [sessions]);

  // Get internal session ID for a given cursor session
  const getInternalSessionId = useCallback((cursorSessionId) => {
    const session = sessions.find(s => s.cursorSessionId === cursorSessionId);
    return session?.id || null;
  }, [sessions]);

  // Helper function to create message handlers for each run
  const createMessageHandler = useCallback((runId, sessionId) => {
    return (payload) => {      
      if (payload && payload.line) {
        try {
          // Try to parse JSON logs
          if (payload.level === 'json') {
            const parsed = JSON.parse(payload.line);
            // Use the message handler hook to process the message
            messageHandler.handleParsedMessage(parsed, sessionId);
            
            // Handle tool calls separately (they need to update tool state)
            if (parsed.type === 'tool_call' && parsed.tool_calls) {
              // Update tool calls for this session
              setSessionToolCalls(sessionId, new Map([
                ...Array.from(getSessionToolCalls(sessionId)),
                [parsed.tool_calls[0]?.id || 'default', parsed]
              ]));
            }
          }
        } catch (error) {
          console.error(`🔧 SessionProvider: Error processing log for runId ${runId}:`, error);
        }
      }
    };
  }, [messageHandler, setSessionToolCalls, getSessionToolCalls]);

  // ===== RETURN VALUES =====

  const returnValue = {
    // State
    sessions,
    currentSessionId,
    busyBySession,
    toolCallsBySession,
    hideToolCallIndicatorsBySession,
    streamingTextBySession,
    terminalLogs,
    showRawTerminal,
    visibleTerminals,
    deferredMessages,
    
    // Actions
    setCurrentSessionId,
    setSessionBusy,
    setSessionToolCalls,
    setSessionHideToolCallIndicators,
    setShowRawTerminal,
    setVisibleTerminals,
    
    // Helper functions
    isSessionBusy,
    getCurrentSessionBusy,
    getSessionToolCalls,
    getCurrentSessionToolCalls,
    getSessionHideToolCallIndicators,
    getCurrentSessionHideToolCallIndicators,
    
    // Streaming text
    getSessionStreamingText,
    setSessionStreamingText,
    getCurrentSessionStreamingText,
    
    // Session management
    createNewSession,
    createNewProjectSession,
    loadSession,
    deleteSession,
    updateSessionWithCursorId,
    saveCurrentSession,
    markSessionRunningTerminal,
    
    // Message handling
    send,
    messageHandler, // Export the message handler for direct use
    
    // Test function to demonstrate message handler usage
    testMessageHandler: (sessionId) => {
      console.log('🧪 Testing message handler for session:', sessionId);
      const testMessage = {
        type: 'session_start',
        session_id: 'test-session-123',
        message: 'Test session start message'
      };
      messageHandler.handleParsedMessage(testMessage, sessionId);
    },
    
    // Test function to manually trigger new project creation
    testNewProjectCreation: (testPrompt = 'Create a simple test app', testTemplate = 'react-vite') => {
      console.log('🧪 Testing new project creation:', { testPrompt, testTemplate });
      
      // Store test project info in localStorage
      const testProjectId = 'test-project-' + Date.now();
      localStorage.setItem(`termi-ai-new-project-${testProjectId}`, testPrompt);
      localStorage.setItem(`termi-ai-new-project-template-${testProjectId}`, testTemplate);
      
      console.log(`🧪 Stored test project info for: ${testProjectId}`);
      
      // Simulate what would happen when navigating to a new project
      return testProjectId;
    },
    
    // Process deferred messages manually
    processDeferredMessages,
    
    // Utility functions
    deriveSessionNameFromMessage,
    
    // Storage
    loadSessions,
    saveSessions,
    
    // Terminal communication
    setupLogRouter,
    cleanupLogRouter,
    handleCursorLog,
    getSessionTerminalStatus,
    getAllSessionsTerminalStatus,
    getCurrentTerminalSession,
    isSessionRunningTerminal,
    getCursorSessionId,
    getInternalSessionId,
    showTerminal,
    hideTerminal,
    isTerminalVisible,
    
    // Terminal log management
    clearSessionTerminalLogs,
    clearAllTerminalLogs,
    getTerminalLogStats
  };
  
  console.log('🔍 useSessionManager returning functions:', {
    hasClearSessionTerminalLogs: !!returnValue.clearSessionTerminalLogs,
    hasClearAllTerminalLogs: !!returnValue.clearAllTerminalLogs,
    hasGetTerminalLogStats: !!returnValue.getTerminalLogStats,
    hasTerminalLogs: !!returnValue.terminalLogs,
    terminalLogsType: typeof returnValue.terminalLogs,
    terminalLogsSize: returnValue.terminalLogs?.size
  });
  
  return returnValue;
};
