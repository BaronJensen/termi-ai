import React, { useState, useEffect, useRef } from 'react';
import { useSession } from '../providers/SessionProvider.jsx';

export default function SessionTerminals() {
  const {
    sessions,
    currentSessionId,
    busyBySession,
    terminalLogs,
    showRawTerminal,
    visibleTerminals,
    setCurrentSessionId,
    setShowRawTerminal,
    hideTerminal,
    showTerminal
  } = useSession();
  
  const terminalScrollers = useRef(new Map()); // sessionId -> { cursor: ref }
  const tabsContainerRef = useRef(null);

  // Auto-scroll to bottom for active terminal
  useEffect(() => {
    const sessionRefs = terminalScrollers.current.get(currentSessionId);
    const scroller = sessionRefs?.cursor;
    if (scroller && scroller.current) {
      scroller.current.scrollTop = scroller.current.scrollHeight;
    }
  }, [terminalLogs, currentSessionId]);

  // Filter sessions to only show those with visible terminals
  const visibleSessions = sessions.filter(session => visibleTerminals.has(session.id));

  // Sort sessions: active (busy) sessions first, then by name
  const sortedSessions = [...visibleSessions].sort((a, b) => {
    const aIsBusy = busyBySession.has(a.id);
    const bIsBusy = busyBySession.has(b.id);
    
    if (aIsBusy && !bIsBusy) return -1;
    if (!aIsBusy && bIsBusy) return 1;
    
    return a.name.localeCompare(b.name);
  });

  // Scroll tabs horizontally
  const scrollTabs = (direction) => {
    if (tabsContainerRef.current) {
      const scrollAmount = 200; // Adjust scroll amount as needed
      tabsContainerRef.current.scrollLeft += direction === 'left' ? -scrollAmount : scrollAmount;
    }
  };

  // Handle terminal close (hide terminal, don't delete session)
  const handleCloseTerminal = (sessionId, event) => {
    event.stopPropagation(); // Prevent tab selection when clicking close
    
    // Don't allow closing the current terminal if it's the only one visible
    if (visibleSessions.length === 1) {
      return;
    }
    
    // Confirm before closing if session is busy
    if (busyBySession.has(sessionId)) {
      if (!confirm('This session is currently running. Are you sure you want to close the terminal?')) {
        return;
      }
    }
    
    // Hide the terminal but keep the session
    hideTerminal(sessionId);
    
    // If we're closing the current session's terminal, switch to another visible one
    if (currentSessionId === sessionId) {
      const remainingSessions = visibleSessions.filter(s => s.id !== sessionId);
      if (remainingSessions.length > 0) {
        setCurrentSessionId(remainingSessions[0].id);
      }
    }
  };

  // Show terminals for sessions that have logs but might be hidden
  const showHiddenTerminals = () => {
    sessions.forEach(session => {
      const sessionLogs = terminalLogs.get(session.id);
      if (sessionLogs?.cursor?.length > 0 && !visibleTerminals.has(session.id)) {
        showTerminal(session.id);
      }
    });
  };

  if (sortedSessions.length === 0) {
    const hasHiddenTerminals = sessions.some(session => {
      const sessionLogs = terminalLogs.get(session.id);
      return sessionLogs?.cursor?.length > 0 && !visibleTerminals.has(session.id);
    });

    return (
      <div style={{
        padding: '20px',
        textAlign: 'center',
        color: '#6b7280',
        fontSize: '14px'
      }}>
        {visibleSessions.length === 0 ? (
          <div>
            <div style={{ marginBottom: '12px' }}>
              No terminal tabs are currently visible. Run a command in any session to show its terminal.
            </div>
            {hasHiddenTerminals && (
              <button
                onClick={showHiddenTerminals}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#3c6df0',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Show Hidden Terminals
              </button>
            )}
          </div>
        ) : (
          'No active sessions with terminal output'
        )}
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Session Terminal Tabs with Horizontal Scrolling */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        borderBottom: '1px solid #1d2633',
        marginBottom: '12px',
        position: 'relative'
      }}>
        {/* Left Scroll Arrow */}
        {sortedSessions.length > 6 && (
          <button
            onClick={() => scrollTabs('left')}
            style={{
              padding: '8px 4px',
              backgroundColor: '#1a2331',
              color: '#6b7280',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '4px 0 0 4px',
              fontSize: '12px',
              minWidth: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Scroll left"
          >
            ‹
          </button>
        )}
        
        {/* Tabs Container */}
        <div
          ref={tabsContainerRef}
          style={{
            display: 'flex',
            overflowX: 'auto',
            overflowY: 'hidden',
            scrollbarWidth: 'none', // Firefox
            msOverflowStyle: 'none', // IE/Edge
            flex: 1,
            minWidth: 0
          }}
        >
          {sortedSessions.map(session => (
            <button
              key={session.id}
              onClick={() => setCurrentSessionId(session.id)}
              style={{
                padding: '8px 12px',
                backgroundColor: currentSessionId === session.id ? '#1a2331' : 'transparent',
                color: currentSessionId === session.id ? '#3c6df0' : '#6b7280',
                border: 'none',
                borderBottom: currentSessionId === session.id ? '2px solid #3c6df0' : 'none',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: currentSessionId === session.id ? '600' : '400',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                minWidth: '120px', // Ensure minimum tab width
                maxWidth: '180px', // Limit maximum tab width
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                flexShrink: 0, // Prevent tabs from shrinking
                position: 'relative'
              }}
              title={session.name} // Show full name on hover
            >
              <span style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
                minWidth: 0
              }}>
                {session.name}
              </span>
              {busyBySession.has(session.id) && (
                <span style={{ color: '#f59e0b', flexShrink: 0 }}>🔄</span>
              )}
              {(() => {
                const sessionLogs = terminalLogs.get(session.id);
                const totalLogs = sessionLogs?.cursor?.length || 0;
                return totalLogs > 0 ? (
                  <span style={{
                    backgroundColor: '#374151',
                    color: '#9ca3af',
                    padding: '2px 6px',
                    borderRadius: '10px',
                    fontSize: '10px',
                    flexShrink: 0
                  }}>
                    {totalLogs}
                  </span>
                ) : null;
              })()}
              
              {/* Close Button */}
              <button
                onClick={(e) => handleCloseTerminal(session.id, e)}
                style={{
                  padding: '2px',
                  backgroundColor: 'transparent',
                  color: currentSessionId === session.id ? '#6b7280' : '#4b5563',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: '3px',
                  fontSize: '14px',
                  lineHeight: '1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '16px',
                  height: '16px',
                  flexShrink: 0,
                  marginLeft: '4px',
                  opacity: 0.7,
                  transition: 'opacity 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '1';
                  e.currentTarget.style.backgroundColor = currentSessionId === session.id ? '#374151' : '#1f2937';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '0.7';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                title="Close terminal"
                disabled={visibleSessions.length === 1}
              >
                ×
              </button>
            </button>
          ))}
        </div>

        {/* Right Scroll Arrow */}
        {sortedSessions.length > 6 && (
          <button
            onClick={() => scrollTabs('right')}
            style={{
              padding: '8px 4px',
              backgroundColor: '#1a2331',
              color: '#6b7280',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '0 4px 4px 0',
              fontSize: '12px',
              minWidth: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Scroll right"
          >
            ›
          </button>
        )}
      </div>

      {/* Terminal Output for Current Session */}
      {currentSessionId && (() => {
        const sessionLogs = terminalLogs.get(currentSessionId);
 
        if (!sessionLogs) {
          return null;
        }

        return (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Terminal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 12px',
              backgroundColor: '#111827',
              borderRadius: '6px',
              marginBottom: '8px'
            }}>
              <div style={{ color: '#cde3ff', fontSize: '11px' }}>
                Terminal: {sessions.find(s => s.id === currentSessionId)?.name}
                {busyBySession.has(currentSessionId) && (
                  <span style={{ marginLeft: '8px', color: '#f59e0b' }}>
                    🔄 Running
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={() => {
                    // Test button to manually add a log entry
                    const testLog = {
                      level: 'info',
                      line: `Test log entry at ${new Date().toLocaleTimeString()}`,
                      ts: Date.now(),
                      tss: new Date().toLocaleTimeString()
                    };
                    setTerminalLogs(prev => {
                      const next = new Map(prev);
                      const sessionLogs = next.get(currentSessionId) || { cursor: [] };
                      const updatedLogs = {
                        ...sessionLogs,
                        cursor: [...sessionLogs.cursor, testLog]
                      };
                      next.set(currentSessionId, updatedLogs);
                      return next;
                    });
                  }}
                  style={{
                    padding: '4px 8px',
                    fontSize: '10px',
                    backgroundColor: '#374151',
                    color: '#9ca3af',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Test Log
                </button>
                <button
                  onClick={() => {
                    // Debug button to show log router state
                    if (window.cursovableLogRouter) {
                      window.cursovableLogRouter.debugState();
                    } else {
                      console.log('🔧 Log router not available');
                    }
                  }}
                  style={{
                    padding: '4px 8px',
                    fontSize: '10px',
                    backgroundColor: '#059669',
                    color: '#d1fae5',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Debug Router
                </button>
                <button
                  onClick={() => {
                    // Debug button to show session state
                    if (window.cursovableLogRouter) {
                      window.cursovableLogRouter.debugSessions();
                    } else {
                      console.log('🔧 Log router not available');
                    }
                  }}
                  style={{
                    padding: '4px 8px',
                    fontSize: '10px',
                    backgroundColor: '#7c3aed',
                    color: '#e9d5ff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Debug Sessions
                </button>
                <label style={{ color: '#cde3ff', fontSize: '10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="checkbox"
                    checked={showRawTerminal.get(currentSessionId) || false}
                    onChange={(e) => {
                      setShowRawTerminal(prev => {
                        const next = new Map(prev);
                        next.set(currentSessionId, e.target.checked);
                        return next;
                      });
                    }}
                  />
                  Raw stream
                </label>
              </div>
            </div>

            {/* Terminal Logs */}
            <div
              ref={(el) => {
                if (el) {
                  const currentRefs = terminalScrollers.current.get(currentSessionId) || {};
                  terminalScrollers.current.set(currentSessionId, {
                    ...currentRefs,
                    cursor: { current: el }
                  });
                }
              }}
              style={{
                flex: 1,
                overflowY: 'auto',
                backgroundColor: '#000000',
                borderRadius: '4px',
                padding: '8px',
                fontFamily: 'ui-monospace, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                fontSize: '11px',
                lineHeight: '1.4'
              }}
            >
              {(() => {
                const tabLogs = sessionLogs.cursor || [];

                if (showRawTerminal.get(currentSessionId)) {
                  return tabLogs.map((log, i) => (
                    <div
                      key={i}
                      style={{
                        color: log.level === 'error' ? '#ef4444' :
                               log.level === 'warn' ? '#f59e0b' :
                               log.level === 'json' ? '#10b981' : '#e6e6e6',
                        marginBottom: '2px',
                        wordBreak: 'break-word'
                      }}
                    >
                      [{log.tss || new Date(log.ts).toLocaleTimeString()}] {log.line}
                    </div>
                  ));
                } else {
                  return tabLogs
                    .filter(l => l.level !== 'stream')
                    .map((log, i) => (
                      <div
                        key={i}
                        style={{
                          color: log.level === 'error' ? '#ef4444' :
                                 log.level === 'warn' ? '#f59e0b' :
                                 log.level === 'json' ? '#10b981' : '#e6e6e6',
                          marginBottom: '2px',
                          wordBreak: 'break-word'
                        }}
                      >
                        [{log.tss || new Date(log.ts).toLocaleTimeString()}] {log.line}
                      </div>
                    ));
                }
              })()}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
