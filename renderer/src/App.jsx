
import React, { useEffect, useMemo, useRef, useState } from 'react'
import Dashboard from './pages/Dashboard.jsx'
import ProjectView from './pages/ProjectView.jsx'

function LegacyApp() {
  const [folder, setFolder] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [manager, setManager] = useState('yarn');
  const [apiKey, setApiKey] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [activeTab, setActiveTab] = useState('vite'); // 'vite' | 'cursor' | 'console'
  const [viteLogs, setViteLogs] = useState([]);
  const [cursorLogs, setCursorLogs] = useState([]);
  const [consoleLogs, setConsoleLogs] = useState([]);
  const [timeoutMinutes, setTimeoutMinutes] = useState(15); // Default 15 minutes
  const webviewRef = useRef(null);
  const viteLogScroller = useRef(null);
  const cursorLogScroller = useRef(null);
  const consoleLogScroller = useRef(null);
  const [agentInput, setAgentInput] = useState('');

  async function chooseFolder() {
    const fp = await window.cursovable.selectFolder();
    if (fp) setFolder(fp);
  }

  async function startPreview() {
    if (!folder) return alert('Select a folder first');
    setIsStarting(true);
    try {
      const { url } = await window.cursovable.startVite({ folderPath: folder, manager });
      setPreviewUrl(url);
    } catch (e) {
      alert(e.message || String(e));
    } finally {
      setIsStarting(false);
    }
  }

  async function stopPreview() {
    await window.cursovable.stopVite();
    setPreviewUrl(null);
  }

  // Subscribe to Vite and cursor-agent logs
  useEffect(() => {
    const unsubV = window.cursovable.onViteLog((payload) => {
      setViteLogs((prev) => {
        const next = [...prev, payload];
        return next.length > 1000 ? next.slice(-1000) : next;
      });
    });
    const unsubC = window.cursovable.onCursorLog((payload) => {
      setCursorLogs((prev) => {
        const next = [...prev, payload];
        return next.length > 1000 ? next.slice(-1000) : next;
      });
    });
    const unsubF = window.cursovable.folderSelected((folderPath) => {
      setFolder(folderPath);
    });
    return () => { 
      unsubV && unsubV(); 
      unsubC && unsubC(); 
      unsubF && unsubF();
    };
  }, []);

  // Auto scroll logs
  useEffect(() => {
    if (viteLogScroller.current) viteLogScroller.current.scrollTop = viteLogScroller.current.scrollHeight;
  }, [viteLogs]);
  useEffect(() => {
    if (cursorLogScroller.current) cursorLogScroller.current.scrollTop = cursorLogScroller.current.scrollHeight;
  }, [cursorLogs]);
  useEffect(() => {
    if (consoleLogScroller.current) consoleLogScroller.current.scrollTop = consoleLogScroller.current.scrollHeight;
  }, [consoleLogs]);

  // Capture webview console
  useEffect(() => {
    const el = webviewRef.current;
    if (!el) return;
    const onConsole = (e) => {
      const line = `[${e.level}] ${e.message}`;
      setConsoleLogs((prev) => {
        const next = [...prev, { level: e.level, line, ts: Date.now() }];
        return next.length > 1000 ? next.slice(-1000) : next;
      });
    };
    el.addEventListener('console-message', onConsole);
    return () => { el.removeEventListener('console-message', onConsole); };
  }, [previewUrl]);

  // Check terminal status periodically
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await window.cursovable.getTerminalStatus();
        const statusEl = document.getElementById('terminal-status');
        if (statusEl) {
          statusEl.textContent = `${status.terminalType} (PTY: ${status.hasPty ? 'Yes' : 'No'})`;
          statusEl.style.color = status.hasPersistentTerminal ? '#4ade80' : '#f87171';
        }
      } catch (err) {
        console.error('Failed to get terminal status:', err);
        const statusEl = document.getElementById('terminal-status');
        if (statusEl) {
          statusEl.textContent = 'Error';
          statusEl.style.color = '#f87171';
        }
      }
    };
    
    checkStatus();
    const interval = setInterval(checkStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app">
      <div className="panel">
        <div className="header">
          <button onClick={chooseFolder}>Choose folder</button>
          <input style={{minWidth: '280px'}} value={folder || ''} placeholder="No folder selected" readOnly />
          <select value={manager} onChange={e => setManager(e.target.value)}>
            <option value="yarn">yarn</option>
            <option value="npm">npm</option>
            <option value="pnpm">pnpm</option>
          </select>
          <button onClick={startPreview} disabled={!folder || isStarting}>Run Vite</button>
          <button className="secondary" onClick={stopPreview}>Stop</button>
          <button className="secondary" onClick={() => setShowDebug(v => !v)}>
            {showDebug ? 'Hide Debug' : 'Show Debug'}
          </button>
        </div>
        <div className="iframe-wrap">
          {previewUrl ? <webview
            ref={webviewRef}
            src={previewUrl}
            style={{width:'100%', height:'100%'}}
            allowpopups="true"
            disablewebsecurity="true"
            webpreferences="contextIsolation, javascript=yes, webSecurity=no, allowRunningInsecureContent=yes"
            partition="persist:default"
          /> : (
            <div style={{padding: 18, opacity: .7}}>Select a React Vite project folder and click “Run Vite”. The app will appear here.</div>
          )}
        </div>

        {showDebug && (
          <div className="debug-panel">
            <div className="tabs">
              <button className={activeTab==='vite'?'active':''} onClick={() => setActiveTab('vite')}>Vite</button>
              <button className={activeTab==='cursor'?'active':''} onClick={() => setActiveTab('cursor')}>Agent</button>
              <button className={activeTab==='console'?'active':''} onClick={() => setActiveTab('console')}>Web Console</button>
            </div>
            <div className="terminal">
              {activeTab==='vite' && (
                <div className="term-scroll" ref={viteLogScroller}>
                  {viteLogs.map((l, i) => (
                    <div key={i} className={`ln ${l.level || 'info'}`}>[{new Date(l.ts).toLocaleTimeString()}] {l.line}</div>
                  ))}
                </div>
              )}
              {activeTab==='cursor' && (
                <>
                  <div className="term-scroll" ref={cursorLogScroller}>
                    {cursorLogs.map((l, i) => (
                      <div key={i} className={`ln ${l.level || 'info'}`}>[{new Date(l.ts).toLocaleTimeString()}] {l.line}</div>
                    ))}
                  </div>
                  <div className="agent-input">
                    <div style={{color: '#cde3ff', fontSize: '11px', marginBottom: '4px'}}>
                      Terminal Console: {cursorLogs.length > 0 ? `(${cursorLogs.length} logs)` : '(No logs yet)'}
                      {cursorLogs.length > 0 && (
                        <span style={{marginLeft: '10px', color: '#ff8a80'}}>
                          Active: {cursorLogs[cursorLogs.length - 1]?.runId === 'persistent' ? 'Persistent Terminal' : `Agent (${cursorLogs[cursorLogs.length - 1]?.runId || 'none'})`}
                        </span>
                      )}
                    </div>
                    <div style={{color: '#cde3ff', fontSize: '10px', marginBottom: '8px', opacity: 0.7}}>
                      Status: <span id="terminal-status">Checking...</span>
                    </div>
                    <input
                      value={agentInput}
                      onChange={(e) => setAgentInput(e.target.value)}
                      placeholder="Type input for agent and press Enter"
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter') {
                          const last = cursorLogs[cursorLogs.length - 1];
                          const runId = last?.runId;
                          console.log('Sending input, runId:', runId, 'input:', agentInput);
                          // Always send input - persistent terminal will handle it if no agent running
                          await window.cursovable.sendCursorInput({ runId, data: agentInput + '\n' });
                          setAgentInput('');
                        }
                        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
                          const last = cursorLogs[cursorLogs.length - 1];
                          const runId = last?.runId;
                          console.log('Sending SIGINT, runId:', runId);
                          // Always send signal - persistent terminal will handle it if no agent running
                          await window.cursovable.sendCursorSignal({ runId, signal: 'SIGINT' });
                        }
                      }}
                    />
                    <button onClick={async () => {
                      const last = cursorLogs[cursorLogs.length - 1];
                      const runId = last?.runId;
                      console.log('Send button clicked, runId:', runId, 'input:', agentInput);
                      // Always send input - persistent terminal will handle it if no agent running
                      await window.cursovable.sendCursorInput({ runId, data: agentInput + '\n' });
                      setAgentInput('');
                    }}>Send</button>
                    <button className="secondary" onClick={async () => {
                      const last = cursorLogs[cursorLogs.length - 1];
                      const runId = last?.runId;
                      console.log('Ctrl+C button clicked, runId:', runId);
                      // Always send signal - persistent terminal will handle it if no agent running
                      await window.cursovable.sendCursorSignal({ runId, signal: 'SIGINT' });
                    }}>Ctrl+C</button>
                    <button className="secondary" onClick={async () => {
                      console.log('Starting persistent terminal...');
                      try {
                        // Send a dummy input to trigger persistent terminal creation
                        const result = await window.cursovable.sendCursorInput({ runId: null, data: '\n' });
                        console.log('Terminal start result:', result);
                        
                        // Wait a moment and check status
                        setTimeout(async () => {
                          const status = await window.cursovable.getTerminalStatus();
                          console.log('Terminal status after start:', status);
                        }, 500);
                      } catch (err) {
                        console.error('Failed to start terminal:', err);
                      }
                    }}>Start Terminal</button>
                  </div>
                </>
              )}
              {activeTab==='console' && (
                <div className="term-scroll" ref={consoleLogScroller}>
                  {consoleLogs.map((l, i) => (
                    <div key={i} className={`ln ${l.level || 'info'}`}>[{new Date(l.ts).toLocaleTimeString()}] {l.line}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="panel chat">
        <div className="header">
          <input placeholder="Optional API key (exported as OPENAI_API_KEY)" value={apiKey} onChange={e => setApiKey(e.target.value)} style={{flex: 1}}/>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
            <label>Timeout:</label>
            <select 
              value={timeoutMinutes} 
              onChange={e => setTimeoutMinutes(Number(e.target.value))}
              style={{ padding: '2px 4px', fontSize: '11px' }}
            >
              <option value={5}>5 min</option>
              <option value={10}>10 min</option>
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
              <option value={60}>60 min</option>
              <option value={0}>No limit</option>
            </select>
          </div>
          <button className="secondary" onClick={async () => { await window.cursovable.clearHistory(); location.reload(); }}>Clear</button>
        </div>
        {/* Chat panel retained for legacy layout; new ProjectView uses its own */}
        <ProjectView projectId={null} onBack={() => {}} />
      </div>
    </div>
  )
}

export default function App() {
  const [route, setRoute] = useState({ name: 'dashboard', params: {} });
  if (route.name === 'project') {
    return <ProjectView projectId={route.params.id} initialMessage={route.params.initialMessage} onBack={() => setRoute({ name: 'dashboard', params: {} })} />
  }
  return <Dashboard onOpenProject={(id, initialMessage) => setRoute({ name: 'project', params: { id, initialMessage } })} />
}
