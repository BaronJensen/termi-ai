import React from 'react';
import SessionTerminals from './SessionTerminals.jsx';

function DebugPanel({
  showDebug,
  activeTab,
  setActiveTab,
  viteLogs,
  consoleLogs,
  perfStats,
  viteLogScroller,
  consoleLogScroller,
  LOG_RENDER_LIMIT,
  formatBytes
}) {
  if (!showDebug) return null;

  return (
    <div className="debug-panel">
      <div className="tabs">
        <button className={activeTab==='vite'?'active':''} onClick={() => setActiveTab('vite')}>Preview</button>
        <button className={activeTab==='sessions'?'active':''} onClick={() => setActiveTab('sessions')}>Sessions</button>
        <button className={activeTab==='console'?'active':''} onClick={() => setActiveTab('console')}>Web Console</button>
        <button className={activeTab==='metrics'?'active':''} onClick={() => setActiveTab('metrics')}>Metrics</button>
      </div>
      <div className="terminal">
        {activeTab==='vite' && (
          <div className="term-scroll" ref={viteLogScroller}>
            {viteLogs.slice(-LOG_RENDER_LIMIT).map((l, i) => (
              <div key={i} className={`ln ${l.level || 'info'}`}>[{l.tss || new Date(l.ts).toLocaleTimeString()}] {l.line}</div>
            ))}
          </div>
        )}

        {activeTab==='console' && (
          <div className="term-scroll" ref={consoleLogScroller}>
            {consoleLogs.slice(-LOG_RENDER_LIMIT).map((l, i) => (
              <div key={i} className={`ln ${l.level || 'info'}`}>[{l.tss || new Date(l.ts).toLocaleTimeString()}] {l.line}</div>
            ))}
          </div>
        )}
        {activeTab==='sessions' && (
          <div className="term-scroll" style={{ padding: 0, height: '100%' }}>
            <SessionTerminals />
          </div>
        )}
        {activeTab==='metrics' && (
          <div className="term-scroll" style={{ padding: 10, color: '#cde3ff' }}>
            {!perfStats ? (
              <div style={{ opacity: 0.7 }}>Collecting metrics…</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ gridColumn: '1 / span 2' }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>App</div>
                  <div style={{ fontFamily: 'ui-monospace, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', fontSize: 12 }}>
                    Main: {Math.round(perfStats.app?.main?.cpu || 0)}% CPU, {perfStats.app?.main?.memoryMB || 0} MB
                    {perfStats.app?.gpu ? (
                      <>
                        <br />GPU: {Math.round(perfStats.app?.gpu?.cpu || 0)}% CPU, {perfStats.app?.gpu?.memoryMB || 0} MB
                      </>
                    ) : null}
                    {(perfStats.app?.renderer || []).length ? (
                      <>
                        <br />Renderers: {(perfStats.app.renderer || []).map((r) => `${r.pid}:${Math.round(r.cpu || 0)}%/${r.memoryMB || 0}MB`).join('  ')}
                      </>
                    ) : null}
                  </div>
                </div>
                <div style={{ gridColumn: '1 / span 2' }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>Children</div>
                  <div style={{ fontFamily: 'ui-monospace, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', fontSize: 12 }}>
                    {(perfStats.children || []).length ? (
                      (perfStats.children || []).map((c) => (
                        <div key={c.pid}>{c.name} (pid {c.pid}): {Math.round(c.cpu || 0)}% CPU, {c.memoryMB || 0} MB</div>
                      ))
                    ) : (
                      <div style={{ opacity: 0.7 }}>No child processes</div>
                    )}
                  </div>
                </div>
                <div style={{ gridColumn: '1 / span 2' }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>I/O</div>
                  <div style={{ fontFamily: 'ui-monospace, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', fontSize: 12 }}>
                    Logs: cursor {formatBytes(perfStats.io?.logsBytesPerSec?.cursor)}, vite {formatBytes(perfStats.io?.logsBytesPerSec?.vite)}
                    <br />Network: {formatBytes(perfStats.io?.networkBytesPerSec)}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default DebugPanel;
