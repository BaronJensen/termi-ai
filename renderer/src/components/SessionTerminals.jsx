import React, { useState, useEffect, useRef } from 'react';
import { useSession } from '../providers/SessionProvider.jsx';

export default function SessionTerminals() {
  const {
    sessions,
    currentSessionId,
    busyBySession,
    terminalLogs,
    showRawTerminal,
    setCurrentSessionId,
    setShowRawTerminal
  } = useSession();
  
  // Debug logging
  console.log('🔍 SessionTerminals render:', {
    sessions: sessions.length,
    currentSessionId,
    terminalLogsSize: terminalLogs.size,
    terminalLogs: Array.from(terminalLogs.entries())
  });
  const terminalScrollers = useRef(new Map()); // sessionId -> { cursor: ref }



  // Auto-scroll to bottom for active terminal
  useEffect(() => {
    const sessionRefs = terminalScrollers.current.get(currentSessionId);
    const scroller = sessionRefs?.cursor;
    if (scroller && scroller.current) {
      scroller.current.scrollTop = scroller.current.scrollHeight;
    }
  }, [terminalLogs, currentSessionId]);

  // Show all sessions, not just active ones
  const allSessions = sessions;

  if (allSessions.length === 0) {
    return (
      <div style={{
        padding: '20px',
        textAlign: 'center',
        color: '#6b7280',
        fontSize: '14px'
      }}>
        No active sessions with terminal output
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Session Terminal Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #1d2633',
        marginBottom: '12px'
      }}>
        {allSessions.map(session => (
          <button
            key={session.id}
            onClick={() => setCurrentSessionId(session.id)}
            style={{
              padding: '8px 16px',
              backgroundColor: currentSessionId === session.id ? '#1a2331' : 'transparent',
              color: currentSessionId === session.id ? '#3c6df0' : '#6b7280',
              border: 'none',
              borderBottom: currentSessionId === session.id ? '2px solid #3c6df0' : 'none',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: currentSessionId === session.id ? '600' : '400',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {session.name}
            {busyBySession.has(session.id) && (
              <span style={{ color: '#f59e0b' }}>🔄</span>
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
                        fontSize: '10px'
                      }}>
                        {totalLogs}
                      </span>
                    ) : null;
                  })()}
          </button>
        ))}
      </div>

      {/* Terminal Output for Current Session */}
      {currentSessionId && (() => {
        const sessionLogs = terminalLogs.get(currentSessionId);
        console.log(`🔍 SessionTerminals: currentSessionId=${currentSessionId}, sessionLogs=`, sessionLogs);
        if (!sessionLogs) {
          console.log(`⚠️  No session logs found for session ${currentSessionId}`);
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
