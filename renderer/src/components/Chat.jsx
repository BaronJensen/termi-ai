
import React, { useEffect, useRef, useState } from 'react';
import { marked } from 'marked';

function Bubble({ who, children }) {
  return <div className={`bubble ${who}`}
    dangerouslySetInnerHTML={{ __html: marked.parse(children || '') }} />;
}

export default function Chat({ apiKey, cwd, timeoutMinutes = 15 }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [terminalStatus, setTerminalStatus] = useState(null);
  const scroller = useRef(null);
  const unsubRef = useRef(null);
  const streamIndexRef = useRef(-1);
  const runIdRef = useRef(null);

  // Check terminal status on mount and when busy changes
  useEffect(() => {
    checkTerminalStatus();
  }, [busy]);

  async function checkTerminalStatus() {
    try {
      const status = await window.cursovable.getTerminalStatus();
      setTerminalStatus(status);
      
      // If there are many active processes, show a warning
      if (status.processCount > 3) {
        console.warn(`High process count detected: ${status.processCount} active processes`);
      }
    } catch (err) {
      console.error('Failed to get terminal status:', err);
      setTerminalStatus({ error: err.message });
    }
  }

  async function forceCleanup() {
    try {
      const result = await window.cursovable.forceTerminalCleanup();
      console.log('Forced cleanup result:', result);
      await checkTerminalStatus();
      setMessages(m => [...m, { who: 'assistant', text: `**Cleanup completed:** ${result.message}. Cleaned ${result.processesCleaned} processes.` }]);
    } catch (err) {
      console.error('Failed to force cleanup:', err);
      setMessages(m => [...m, { who: 'assistant', text: `**Cleanup failed:** ${err.message}` }]);
    }
  }

  useEffect(() => {
    (async () => {
      const hist = await window.cursovable.getHistory();
      const display = [];
      for (const item of hist) {
        if (item.type === 'result') {
          display.push({ who: 'user', text: item.prompt || item.message || '(message not stored)' });
          display.push({ who: 'assistant', text: item.result || JSON.stringify(item) });
        } else if (item.type === 'raw') {
          display.push({ who: 'assistant', text: '```\n' + item.output + '\n```' });
        }
      }
      setMessages(display);
    })();
  }, []);

  useEffect(() => {
    if (scroller.current) {
      scroller.current.scrollTop = scroller.current.scrollHeight;
    }
  }, [messages, busy]);

  async function send() {
    const text = input.trim();
    if (!text) return;
    
    // Check if working directory is selected
    if (!cwd) {
      alert('Please select a working directory first using the "Change" button above.');
      return;
    }
    
    setInput('');
    setMessages(m => [...m, { who: 'user', text }]);
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
        return [...m, { who: 'assistant', text: '🤔 Thinking...' }];
      });
      
      // Track accumulated assistant text
      let accumulatedText = '';
      
      // Subscribe to log stream for this run
      unsubRef.current = window.cursovable.onCursorLog((payload) => {
        if (!payload || payload.runId !== runIdRef.current) return;
        
        try {
          // Parse each line as JSON
          const lines = payload.line.split('\n').filter(line => line.trim());
          
          for (const line of lines) {
            try {
              const parsed = JSON.parse(line);
              
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
                        updated[idx] = { ...updated[idx], text: accumulatedText };
                        return updated;
                      }
                      return m;
                    });
                  }
                }
              }
              
                    // Stop streaming when we get a result
      if (parsed.type === 'result') {
        // Don't show the final result message since we already have the streamed text
        // If we didn't get any assistant content, show a fallback message
        if (!accumulatedText.trim()) {
          setMessages(m => {
            const idx = streamIndexRef.current;
            if (idx >= 0 && idx < m.length) {
              const updated = [...m];
              updated[idx] = { ...updated[idx], text: 'No response content received from cursor-agent.' };
              return updated;
            }
            return m;
          });
        }
        return;
      }
            } catch (parseError) {
              // Skip lines that aren't valid JSON
              continue;
            }
          }
        } catch (error) {
          console.error('Error processing log line:', error);
        }
      });

      const res = await window.cursovable.runCursor({ 
        message: text, 
        apiKey: apiKey || undefined, 
        cwd: cwd || undefined, 
        runId,
        timeoutMs: timeoutMinutes * 60 * 1000 // Convert minutes to milliseconds
      });
      // We just need to ensure the process completed successfully
      if (res.type === 'error') {
        throw new Error(res.error || 'Unknown error occurred');
      }
    } catch (e) {
      console.error('Cursor agent error:', e);
      
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
          updated[idx] = { who: 'assistant', text };
          return updated;
        }
        return [...m, { who: 'assistant', text }];
      });
      
      // Update terminal status after error
      await checkTerminalStatus();
    } finally {
      if (unsubRef.current) { try { unsubRef.current(); } catch {} unsubRef.current = null; }
      streamIndexRef.current = -1;
      runIdRef.current = null;
      setBusy(false);
    }
  }

  return (
    <>
      {/* Working directory header */}
      <div className="working-dir-header" style={{
        padding: '8px 12px',
        margin: '8px 0',
        backgroundColor: '#f0f0f0',
        borderRadius: '4px',
        fontSize: '12px',
        fontFamily: 'monospace',
        border: '1px solid #ddd',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <strong>Working Directory:</strong> 
          <span style={{ color: !cwd ? '#ff4444' : 'inherit', fontWeight: !cwd ? 'bold' : 'normal' }}>
            {cwd || '⚠️ NO DIRECTORY SELECTED'}
          </span> | 
          <strong>Timeout:</strong> {timeoutMinutes === 0 ? 'No limit' : `${timeoutMinutes} min`}
        </div>
        <button 
          onClick={async () => {
            try {
              const folderPath = await window.cursovable.selectFolder();
              if (folderPath) {
                await window.cursovable.setWorkingDirectory(folderPath);
                // Force a re-render by updating the cwd prop
                window.location.reload();
              }
            } catch (err) {
              console.error('Failed to set working directory:', err);
              alert(`Failed to set working directory: ${err.message}`);
            }
          }}
          style={{
            fontSize: '10px',
            padding: '2px 6px',
            backgroundColor: '#007acc',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer'
          }}
        >
          Change
        </button>
      </div>
      
      {/* Debug panel */}
      {terminalStatus && (
        <div className="debug-panel" style={{ 

          padding: '10px', 
          margin: '10px 0', 
          borderRadius: '5px',
          fontSize: '12px',
          fontFamily: 'monospace'
        }}>
          <strong>Terminal Status:</strong> {terminalStatus.terminalType || 'none'} | 
          Processes: {terminalStatus.processCount || 0} | 
          PTY: {terminalStatus.hasPty ? '✓' : '✗'} | 
          Vite: {terminalStatus.hasViteProcess ? '✓' : '✗'}
          {terminalStatus.processCount > 2 && (
            <button 
              onClick={forceCleanup}
              style={{ 
                marginLeft: '10px', 
                padding: '2px 8px', 
                background: '#ff4444', 
                color: 'white', 
                border: 'none', 
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              Force Cleanup
            </button>
          )}
        </div>
      )}
      
      <div className="messages" ref={scroller}>
        {messages.map((m, i) => (<Bubble key={i} who={m.who}>{m.text}</Bubble>))}
        {busy && <div className="bubble">Working…</div>}
      </div>
      <div className="input">
        <textarea
          placeholder={!cwd ? 'Please select a working directory first...' : `Ask the CTO agent… (timeout: ${timeoutMinutes === 0 ? 'no limit' : `${timeoutMinutes} min`})`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') send();
          }}
          disabled={!cwd}
        />
        <button onClick={send} disabled={busy || !cwd} style={{ opacity: !cwd ? 0.5 : 1 }}>
          {!cwd ? 'Select Directory First' : 'Send'}
        </button>
      </div>
    </>
  );
}
