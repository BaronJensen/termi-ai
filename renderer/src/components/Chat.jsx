
import React, { useEffect, useRef, useState } from 'react';
import { marked } from 'marked';

function Bubble({ who, children }) {
  return <div className={`bubble ${who}`}
    dangerouslySetInnerHTML={{ __html: marked.parse(children || '') }} />;
}

export default function Chat({ apiKey }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scroller = useRef(null);
  const unsubRef = useRef(null);
  const streamIndexRef = useRef(-1);
  const runIdRef = useRef(null);

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

      const res = await window.cursovable.runCursor({ message: text, apiKey: apiKey || undefined, runId });
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
      // Render error in the streaming bubble if available
      setMessages(m => {
        const idx = streamIndexRef.current;
        const text = `**Error:** ${e.message || String(e)}`;
        if (idx >= 0 && idx < m.length) {
          const updated = [...m];
          updated[idx] = { who: 'assistant', text };
          return updated;
        }
        return [...m, { who: 'assistant', text }];
      });
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
