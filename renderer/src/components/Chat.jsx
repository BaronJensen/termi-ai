
import React, { useEffect, useRef, useState } from 'react';
import { marked } from 'marked';

function Bubble({ who, children }) {
  return <div className={`bubble ${who}`}
    dangerouslySetInnerHTML={{ __html: marked.parse(children || '') }} />;
}

export default function Chat({ apiKey, cwd }) {
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
    setInput('');
    setMessages(m => [...m, { who: 'user', text }]);
    setBusy(true);
    try {
      // Prepare streaming message and subscribe to logs for this run
      const runId = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
      runIdRef.current = runId;
      // Show working directory info before the first agent stream
      setMessages(m => [...m, { who: 'assistant', text: `Running in: \`${(cwd || '(default)')}\`` }]);
      // Create a streaming assistant bubble (code fence)
      let streamIdx;
      setMessages(m => {
        streamIdx = m.length;
        streamIndexRef.current = streamIdx;
        return [...m, { who: 'assistant', text: '```\n' }];
      });
      // Subscribe to log stream for this run
      unsubRef.current = window.cursovable.onCursorLog((payload) => {
        if (!payload || payload.runId !== runIdRef.current) return;
        // Append incoming line(s) to the streaming bubble
        setMessages((m) => {
          const idx = streamIndexRef.current;
          if (idx < 0 || idx >= m.length) return m;
          const updated = [...m];
          const curr = updated[idx];
          const add = payload.line || '';
          updated[idx] = { ...curr, text: curr.text + add };
          return updated;
        });
      });

      const res = await window.cursovable.runCursor({ message: text, apiKey: apiKey || undefined, cwd: cwd || undefined, runId });
      // Persisted in main; we also show it in UI
      if (res.type === 'result') {
        // Replace streaming bubble with final markdown
        setMessages(m => {
          const idx = streamIndexRef.current;
          if (idx >= 0 && idx < m.length) {
            const updated = [...m];
            updated[idx] = { who: 'assistant', text: res.result };
            return updated;
          }
          return [...m, { who: 'assistant', text: res.result }];
        });
      } else {
        // Close code fence and render raw output
        setMessages(m => {
          const idx = streamIndexRef.current;
          if (idx >= 0 && idx < m.length) {
            const updated = [...m];
            const curr = updated[idx];
            updated[idx] = { ...curr, text: curr.text + '\n```' };
            return updated;
          }
          return [...m, { who: 'assistant', text: '```\n' + (res.output || JSON.stringify(res)) + '\n```' }];
        });
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
      // Ensure code fence is closed if we were streaming raw
      setMessages(m => {
        const idx = streamIndexRef.current;
        if (idx >= 0 && idx < m.length) {
          const updated = [...m];
          const curr = updated[idx];
          // Close fence if it's still open
          if (curr.text && curr.text.endsWith('```\n')) return m;
          if (curr.text && !curr.text.trim().endsWith('```')) {
            updated[idx] = { ...curr, text: curr.text + (curr.text.endsWith('\n') ? '' : '\n') + '```' };
            return updated;
          }
        }
        return m;
      });
      streamIndexRef.current = -1;
      runIdRef.current = null;
      setBusy(false);
    }
  }

  return (
    <>
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
          placeholder="Ask the CTO agent… (we'll run: cursor-agent -p --output-format=json)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') send();
          }}
        />
        <button onClick={send} disabled={busy}>Send</button>
      </div>
    </>
  );
}
