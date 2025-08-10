
import React, { useEffect, useMemo, useRef, useState } from 'react'
import Chat from './components/Chat.jsx'

export default function App() {
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
  const webviewRef = useRef(null);
  const viteLogScroller = useRef(null);
  const cursorLogScroller = useRef(null);
  const consoleLogScroller = useRef(null);

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
    return () => { unsubV && unsubV(); unsubC && unsubC(); };
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
                <div className="term-scroll" ref={cursorLogScroller}>
                  {cursorLogs.map((l, i) => (
                    <div key={i} className={`ln ${l.level || 'info'}`}>[{new Date(l.ts).toLocaleTimeString()}] {l.line}</div>
                  ))}
                </div>
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
          <button className="secondary" onClick={async () => { await window.cursovable.clearHistory(); location.reload(); }}>Clear</button>
        </div>
        <Chat apiKey={apiKey} />
      </div>
    </div>
  )
}
