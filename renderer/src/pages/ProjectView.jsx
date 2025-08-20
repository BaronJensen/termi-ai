import React, { useEffect, useRef, useState } from 'react';
import Chat from '../components/Chat.jsx';
import SessionTerminals from '../components/SessionTerminals.jsx';
import ProjectHeader from '../components/ProjectHeader.jsx';
import ProjectPreview from '../components/ProjectPreview.jsx';
import DebugPanel from '../components/DebugPanel.jsx';
import CommitModal from '../components/CommitModal.jsx';
import { SessionProvider } from '../providers/SessionProvider.jsx';
import { getProject, updateProject } from '../store/projects';
import { loadSettings } from '../store/settings';

import useDesignSystemStyles from '../ui/useDesignSystemStyles';

function ProjectViewInner({ projectId, onBack, initialMessage }) {
  useDesignSystemStyles();
  const project = getProject(projectId);
  const [folder, setFolder] = useState(project?.path || null);

  const [previewUrl, setPreviewUrl] = useState(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const projectType = project?.runningConfig?.projectType || 'vite';
  const autoStartedRef = useRef(false);
  const [routes, setRoutes] = useState([]);
  const [routeQuery, setRouteQuery] = useState('');
  const pendingRouteRef = useRef(null);
  const [editors, setEditors] = useState([]);
  const [selectedEditor, setSelectedEditor] = useState(() => loadSettings().defaultEditor || '');
  const [viewportMode, setViewportMode] = useState('desktop'); // 'desktop', 'tablet', 'phone'
  const [isChatVisible, setIsChatVisible] = useState(true);
  const [showDebug, setShowDebug] = useState(false);
  const [activeTab, setActiveTab] = useState('vite'); // 'vite' | 'sessions' | 'console' | 'metrics'
  const [viteLogs, setViteLogs] = useState([]);
  const [cursorLogs, setCursorLogs] = useState([]);
  const [rawCursorLogs, setRawCursorLogs] = useState([]);
  const [consoleLogs, setConsoleLogs] = useState([]);
  const LOG_STORE_LIMIT = 1000; // keep memory bounded
  const LOG_RENDER_LIMIT = 300; // render fewer lines for performance
  const viteBufferRef = useRef([]);
  const cursorBufferRef = useRef([]);
  const rawCursorBufferRef = useRef([]);
  const consoleBufferRef = useRef([]);
  const flushScheduledRef = useRef(false);
  const [showRawTerminal, setShowRawTerminal] = useState(false);
  const viteLogScroller = useRef(null);
  const cursorLogScroller = useRef(null);
  const consoleLogScroller = useRef(null);
  const [terminalStatusText, setTerminalStatusText] = useState('Checking...');
  const webviewRef = useRef(null);
  const [perfStats, setPerfStats] = useState(null);
  // Commit modal state
  const [showCommit, setShowCommit] = useState(false);

  // Inject lightweight loader styles
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pv-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      @keyframes pv-shimmer {
        0% { background-position: 0% 50%; }
        100% { background-position: 200% 50%; }
      }
      .pv-loader {
        display: flex; align-items: center; justify-content: center; gap: 14px;
        height: 100%; width: 100%;
        background: radial-gradient(600px 220px at 50% -120px, rgba(60,109,240,.24), transparent 60%),
                    linear-gradient(135deg, #0b1018 0%, #1a2331 100%);
        border: 1px solid #1d2633; border-radius: 12px;
      }
      .pv-spinner {
        width: 26px; height: 26px; border-radius: 50%;
        border: 3px solid rgba(205,227,255,.25);
        border-top-color: #3c6df0;
        animation: pv-spin 1s linear infinite;
        filter: drop-shadow(0 0 6px rgba(60,109,240,.35));
      }
      .pv-text { color: #e6e6e6; font-weight: 600; letter-spacing: .2px; }
      .pv-sub { font-size: 12px; color: #c9d5e1; opacity: .8; margin-top: 4px; }
      .pv-pill {
        display: inline-block; margin-left: 8px; padding: 4px 8px; border-radius: 999px; font-size: 11px;
        color: #cde3ff; border: 1px solid #2a3b55;
        background: linear-gradient(90deg, #0f172a, #1e293b, #0f172a);
        background-size: 200% 100%; animation: pv-shimmer 2.5s ease-in-out infinite;
      }
    `;
    document.head.appendChild(style);
    return () => { try { document.head.removeChild(style); } catch {} };
  }, []);

  // Normalize terminal output for readability
  function sanitizeTerminalText(input) {
    if (!input) return '';
    let text = String(input);
    // Convert carriage returns that overwrite lines into newlines
    text = text.replace(/\r(?!\n)/g, '\n');
    // Strip ANSI escape sequences (with or without ESC prefix)
    text = text.replace(/\u001b\[[0-9;]*[A-Za-z]/g, ''); // ESC-prefixed
    text = text.replace(/\x1b\[[0-9;]*[A-Za-z]/g, ''); // ESC as hex
    text = text.replace(/\[[0-9;]*m/g, ''); // stray color segments
    // Remove other non-printable control chars except tab/newline
    text = text.replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '');
    // Collapse excessive whitespace created by stripping
    text = text.replace(/[\t ]{2,}/g, ' ');
    return text;
  }

  function formatBytes(b) {
    const n = Number(b || 0);
    if (n < 1024) return `${Math.round(n)} B/s`;
    if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB/s`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB/s`;
  }

  function flushLogBuffers() {
    // Flush vite
    setViteLogs((prev) => {
      if (!viteBufferRef.current.length) return prev;
      const merged = prev.concat(viteBufferRef.current);
      viteBufferRef.current = [];
      return merged.length > LOG_STORE_LIMIT ? merged.slice(-LOG_STORE_LIMIT) : merged;
    });
    // Flush cursor
    setCursorLogs((prev) => {
      if (!cursorBufferRef.current.length) return prev;
      const merged = prev.concat(cursorBufferRef.current);
      cursorBufferRef.current = [];
      return merged.length > LOG_STORE_LIMIT ? merged.slice(-LOG_STORE_LIMIT) : merged;
    });
    // Flush raw cursor
    setRawCursorLogs((prev) => {
      if (!rawCursorBufferRef.current.length) return prev;
      const merged = prev.concat(rawCursorBufferRef.current);
      rawCursorBufferRef.current = [];
      return merged.length > LOG_STORE_LIMIT ? merged.slice(-LOG_STORE_LIMIT) : merged;
    });
    // Flush console
    setConsoleLogs((prev) => {
      if (!consoleBufferRef.current.length) return prev;
      const merged = prev.concat(consoleBufferRef.current);
      consoleBufferRef.current = [];
      return merged.length > LOG_STORE_LIMIT ? merged.slice(-LOG_STORE_LIMIT) : merged;
    });
    flushScheduledRef.current = false;
  }

  function scheduleFlush() {
    if (flushScheduledRef.current) return;
    flushScheduledRef.current = true;
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => flushLogBuffers());
    } else {
      setTimeout(() => flushLogBuffers(), 50);
    }
  }

  function appendSanitizedLogsBuffered(bufferRef, payload) {
    const ts = payload.ts || Date.now();
    const level = payload.level || 'info';
    const runId = payload.runId;
    const raw = String(payload.line || '');
    const normalized = sanitizeTerminalText(raw);
    const lines = normalized.split(/\n/);
    const tsString = new Date(ts).toLocaleTimeString();
    for (const ln of lines) {
      const trimmed = ln.replace(/\s+$/g, '');
      if (trimmed.length === 0) continue;
      bufferRef.current.push({ level, line: trimmed, ts, tss: tsString, ...(runId ? { runId } : {}) });
    }
    scheduleFlush();
  }

  function appendRawLogsBuffered(bufferRef, payload) {
    const ts = payload.ts || Date.now();
    const level = payload.level || 'info';
    const runId = payload.runId;
    const raw = String(payload.line || '');
    const lines = raw.split(/\n/);
    const tsString = new Date(ts).toLocaleTimeString();
    for (const ln of lines) {
      const trimmed = ln.replace(/\s+$/g, '');
      if (trimmed.length === 0) continue;
      bufferRef.current.push({ level, line: trimmed, ts, tss: tsString, ...(runId ? { runId } : {}) });
    }
    scheduleFlush();
  }

  if (!project) {
    return (
      <div style={{ padding: 16 }}>
        <button className="secondary" onClick={onBack}>Back</button>
        <div style={{ marginTop: 12 }}>Project not found.</div>
      </div>
    );
  }

  async function startPreview() {
    if (!folder) return alert('Select a folder first');
    try {
      // Always attempt to install deps for non-HTML projects before starting preview
      if (projectType !== 'html') {
        setIsInstalling(true);
        try {
          const { packageManager } = loadSettings();
          const res = await window.cursovable.installPackages({ folderPath: folder, manager: packageManager || 'yarn' });
          if (!res || !res.ok) {
            console.warn('Dependency install failed or returned error:', res?.error);
          }
        } catch (e) {
          console.warn('Install step failed:', e);
        } finally {
          setIsInstalling(false);
        }
      }

      setIsStarting(true);
      let urlObj;
      if (projectType === 'html') {
        urlObj = await window.cursovable.startHtml({ folderPath: folder });
      } else {
        const { packageManager } = loadSettings();
        urlObj = await window.cursovable.startVite({ folderPath: folder, manager: packageManager || 'yarn' });
      }
      const { url } = urlObj;
      setPreviewUrl(url);
    } catch (e) {
      alert(e.message || String(e));
    } finally {
      setIsStarting(false);
    }
  }

  async function stopPreview() {
    if (projectType === 'html') {
      await window.cursovable.stopHtml();
    } else {
      await window.cursovable.stopVite();
    }
    setPreviewUrl(null);
  }

  function openCommitModal() {
    if (!folder) return alert('Select a folder first');
    setShowCommit(true);
  }

  // Ensure preview is stopped when unmounting to avoid leaks
  useEffect(() => {
    return () => {
      try { stopPreview(); } catch {}
    };
  }, []);

  async function handleBack() {
    try { await stopPreview(); } catch {}
    onBack();
  }

  // Auto-run preview once when the page opens and a folder exists
  useEffect(() => {
    if (folder && !autoStartedRef.current) {
      autoStartedRef.current = true;
      startPreview();
    }
  }, [folder]);

  // Fetch project routes for autocomplete
  useEffect(() => {
    (async () => {
      try {
        if (!folder) return;
        const res = await window.cursovable.getProjectRoutes({ folderPath: folder, projectType });
        if (res && res.ok && Array.isArray(res.routes)) {
          setRoutes(res.routes);
        } else {
          setRoutes([]);
        }
      } catch {
        setRoutes([]);
      }
    })();
  }, [folder, projectType]);

  // Detect available editors for the menu
  useEffect(() => {
    (async () => {
      try {
        const list = await window.cursovable.detectEditors();
        if (Array.isArray(list)) setEditors(list);
      } catch {}
    })();
  }, []);

  // Apply default editor from settings once editors are detected
  useEffect(() => {
    try {
      if (!selectedEditor && editors.length > 0) {
        const s = loadSettings();
        if (s.defaultEditor && editors.includes(s.defaultEditor)) {
          setSelectedEditor(s.defaultEditor);
        }
      }
    } catch {}
  }, [editors]);

  // If preview becomes available and we have a pending route, navigate to it
  useEffect(() => {
    if (previewUrl && pendingRouteRef.current) {
      const r = pendingRouteRef.current;
      pendingRouteRef.current = null;
      navigateToRoute(r);
    }
  }, [previewUrl]);

  // Set up webview navigation listener to sync route input
  useEffect(() => {
    if (!previewUrl) return;

    const setupWebviewListener = () => {
      const wb = webviewRef.current || document.querySelector('webview');
      if (!wb) return;

      const handleNavigation = () => {
        try {
          const currentUrl = wb.getURL();
          if (currentUrl && previewUrl) {
            const baseUrl = new URL(previewUrl);
            const currentUrlObj = new URL(currentUrl);
            
            // Only update if it's the same origin (our dev server)
            if (currentUrlObj.origin === baseUrl.origin) {
              const path = currentUrlObj.pathname;
              setRouteQuery(path === '/' ? '' : path);
            }
          }
        } catch (e) {
          // Ignore errors from cross-origin or invalid URLs
        }
      };

      // Listen for navigation events
      wb.addEventListener('did-navigate', handleNavigation);
      wb.addEventListener('did-navigate-in-page', handleNavigation);

      return () => {
        wb.removeEventListener('did-navigate', handleNavigation);
        wb.removeEventListener('did-navigate-in-page', handleNavigation);
      };
    };

    // Setup listener after a short delay to ensure webview is ready
    const timeout = setTimeout(setupWebviewListener, 500);
    
    return () => {
      clearTimeout(timeout);
    };
  }, [previewUrl]);

  // Subscribe to preview and cursor logs (buffered to reduce re-renders)
  useEffect(() => {
    const unsubV = window.cursovable.onViteLog((payload) => {
      appendSanitizedLogsBuffered(viteBufferRef, payload);
    });
    const unsubC = window.cursovable.onCursorLog((payload) => {
      appendSanitizedLogsBuffered(cursorBufferRef, payload);
      appendRawLogsBuffered(rawCursorBufferRef, payload);
    });
    return () => { try { unsubV && unsubV(); } catch {} try { unsubC && unsubC(); } catch {} };
  }, []);



  // Perf stats subscription
  useEffect(() => {
    let unsub = null;
    let started = false;
    const onPerf = (payload) => setPerfStats(payload);
    try {
      if (window.cursovable && window.cursovable.onPerfStats) {
        unsub = window.cursovable.onPerfStats(onPerf);
      }
    } catch {}
    (async () => { try { if (window.cursovable && window.cursovable.startPerf) { await window.cursovable.startPerf(); started = true; } } catch {} })();
    return () => {
      try { unsub && unsub(); } catch {}
      try { if (started && window.cursovable && window.cursovable.stopPerf) window.cursovable.stopPerf(); } catch {}
    };
  }, []);

  // Auto-scroll logs
  useEffect(() => { if (viteLogScroller.current) viteLogScroller.current.scrollTop = viteLogScroller.current.scrollHeight; }, [viteLogs]);
  useEffect(() => { if (cursorLogScroller.current) cursorLogScroller.current.scrollTop = cursorLogScroller.current.scrollHeight; }, [cursorLogs]);
  useEffect(() => { if (showRawTerminal && cursorLogScroller.current) cursorLogScroller.current.scrollTop = cursorLogScroller.current.scrollHeight; }, [rawCursorLogs, showRawTerminal]);
  useEffect(() => { if (consoleLogScroller.current) consoleLogScroller.current.scrollTop = consoleLogScroller.current.scrollHeight; }, [consoleLogs]);

  // Capture webview console messages (buffered)
  useEffect(() => {
    const el = webviewRef.current;
    if (!el) return;
    const onConsole = (e) => {
      const ts = Date.now();
      const tss = new Date(ts).toLocaleTimeString();
      const line = `[${e.level}] ${e.message}`;
      consoleBufferRef.current.push({ level: e.level, line, ts, tss });
      scheduleFlush();
    };
    el.addEventListener('console-message', onConsole);
    return () => { try { el.removeEventListener('console-message', onConsole); } catch {} };
  }, [previewUrl]);

  // Periodically check terminal status
  useEffect(() => {
    let mounted = true;
    const checkStatus = async () => {
      try {
        const status = await window.cursovable.getTerminalStatus();
        if (!mounted) return;
        const text = `${status.terminalType} (PTY: ${status.hasPty ? 'Yes' : 'No'})`;
        setTerminalStatusText(text);
      } catch {
        if (!mounted) return;
        setTerminalStatusText('Error');
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 2000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  // Get viewport dimensions based on mode
  function getViewportStyle() {
    const baseStyle = { width: '100%', height: '100%' };
    
    switch (viewportMode) {
      case 'tablet':
        return {
          ...baseStyle,
          maxWidth: '768px',
          margin: '0 auto',
          border: '2px solid #374151',
          borderRadius: '12px',
          backgroundColor: '#1f2937'
        };
      case 'phone':
        return {
          ...baseStyle,
          maxWidth: '375px',
          margin: '0 auto',
          border: '2px solid #374151',
          borderRadius: '20px',
          backgroundColor: '#1f2937'
        };
      default: // desktop
        return baseStyle;
    }
  }

  function navigateToRoute(route) {
    const r = (route || '/').trim();
    const wb = document.querySelector('webview');
    if (!wb) return;
    if (!previewUrl) {
      pendingRouteRef.current = r;
      startPreview();
      return;
    }
    try {
      const base = new URL(previewUrl);
      const path = r.startsWith('/') ? r.slice(1) : r;
      base.pathname = path;
      wb.src = base.toString();
    } catch {}
  }

  const rightPanelVisible = isChatVisible || showCommit;

  return (
    <div className="app" style={{ gridTemplateColumns: rightPanelVisible ? '1.6fr 0.8fr' : '1fr' }}>
      <div className="panel">
        <ProjectHeader
          projectType={projectType}
          routeQuery={routeQuery}
          setRouteQuery={setRouteQuery}
          routes={routes}
          navigateToRoute={navigateToRoute}
          previewUrl={previewUrl}
          folder={folder}
          isStarting={isStarting}
          isInstalling={isInstalling}
          startPreview={startPreview}
          stopPreview={stopPreview}
          openCommitModal={openCommitModal}
          viewportMode={viewportMode}
          setViewportMode={setViewportMode}
          selectedEditor={selectedEditor}
          setSelectedEditor={setSelectedEditor}
          editors={editors}
          isChatVisible={isChatVisible}
          setIsChatVisible={setIsChatVisible}
          showDebug={showDebug}
          setShowDebug={setShowDebug}
          onBack={handleBack}
        />
        <ProjectPreview
          previewUrl={previewUrl}
          isInstalling={isInstalling}
          isStarting={isStarting}
          projectType={projectType}
          viewportMode={viewportMode}
          webviewRef={webviewRef}
          getViewportStyle={getViewportStyle}
        />

        <DebugPanel
          showDebug={showDebug}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          viteLogs={viteLogs}
          consoleLogs={consoleLogs}
          perfStats={perfStats}
          viteLogScroller={viteLogScroller}
          consoleLogScroller={consoleLogScroller}
          LOG_RENDER_LIMIT={LOG_RENDER_LIMIT}
          formatBytes={formatBytes}
        />

      </div>

      {rightPanelVisible && (
        <div className="panel chat">
          {showCommit ? (
            <CommitModal 
              isVisible={showCommit}
              onClose={() => setShowCommit(false)}
              folder={folder}
            />
          ) : (
            <Chat 
              cwd={folder} 
              projectId={projectId}
              {...(initialMessage && { initialMessage })}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default function ProjectView({ projectId, onBack, initialMessage }) {
  return (
    <SessionProvider projectId={projectId}>
      <ProjectViewInner 
        projectId={projectId} 
        onBack={onBack} 
        initialMessage={initialMessage} 
      />
    </SessionProvider>
  );
}


