import React, { useEffect, useRef, useState } from 'react';
import Chat from '../components/Chat.jsx';
import { getProject, updateProject } from '../store/projects';
import { loadSettings } from '../store/settings';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Label from '../ui/Label';
import Select from '../ui/Select';
import Textarea from '../ui/Textarea';
import useDesignSystemStyles from '../ui/useDesignSystemStyles';

export default function ProjectView({ projectId, onBack, initialMessage }) {
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
  const [activeTab, setActiveTab] = useState('vite'); // 'vite' | 'cursor' | 'console'
  const [viteLogs, setViteLogs] = useState([]);
  const [cursorLogs, setCursorLogs] = useState([]);
  const [consoleLogs, setConsoleLogs] = useState([]);
  const viteLogScroller = useRef(null);
  const cursorLogScroller = useRef(null);
  const consoleLogScroller = useRef(null);
  const [terminalStatusText, setTerminalStatusText] = useState('Checking...');
  const webviewRef = useRef(null);
  // Commit modal state
  const [showCommit, setShowCommit] = useState(false);
  const [commitBusy, setCommitBusy] = useState(false);
  const [commitError, setCommitError] = useState('');
  const [commitMessage, setCommitMessage] = useState('');
  const [commitMode, setCommitMode] = useState('existing'); // 'existing' | 'new'
  const [branches, setBranches] = useState([]);
  const [currentBranch, setCurrentBranch] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [newBranchName, setNewBranchName] = useState('');
  const [isGitRepo, setIsGitRepo] = useState(null);
  const [commitOnCurrent, setCommitOnCurrent] = useState(true);
  // Restore local commits UI state
  const [reflogEntries, setReflogEntries] = useState([]);
  const [showRestore, setShowRestore] = useState(false);
  const [restoreBusy, setRestoreBusy] = useState(false);
  const [restoreError, setRestoreError] = useState('');
  // restore works only on current branch now; no branch creation name
  const [hasUpstream, setHasUpstream] = useState(false);
  const [upstreamRef, setUpstreamRef] = useState('');

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

  function appendSanitizedLogs(setter, payload) {
    const ts = payload.ts || Date.now();
    const level = payload.level || 'info';
    const runId = payload.runId;
    const raw = String(payload.line || '');
    const normalized = sanitizeTerminalText(raw);
    const lines = normalized.split(/\n/);
    setter((prev) => {
      const next = [...prev];
      for (const ln of lines) {
        const trimmed = ln.replace(/\s+$/g, '');
        if (trimmed.length === 0) continue;
        next.push({ level, line: trimmed, ts, ...(runId ? { runId } : {}) });
      }
      return next.length > 1000 ? next.slice(-1000) : next;
    });
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

  async function openCommitModal() {
    if (!folder) return alert('Select a folder first');
    setCommitError('');
    setCommitMessage('');
    setCommitMode('existing');
    setNewBranchName('');
    setCommitOnCurrent(true);
    try {
      const res = await window.cursovable.getGitBranches({ folderPath: folder });
      if (!res || res.ok === false) {
        setBranches([]);
        setCurrentBranch('');
        setIsGitRepo(false);
      } else {
        setBranches(res.branches || []);
        setCurrentBranch(res.current || '');
        setSelectedBranch(res.current || (res.branches?.[0] || ''));
        setIsGitRepo(!!res.isRepo);
        setHasUpstream(!!res.hasUpstream);
        setUpstreamRef(res.upstream || '');
      }
    } catch {
      setBranches([]);
      setCurrentBranch('');
      setIsGitRepo(false);
    }
    try {
      const reflogRes = await window.cursovable.getReflog({ folderPath: folder, limit: 50 });
      if (reflogRes && reflogRes.ok) setReflogEntries(reflogRes.entries || []);
      else setReflogEntries([]);
    } catch { setReflogEntries([]); }
    setShowCommit(true);
  }

  async function performCommit() {
    if (!folder) return;
    const message = commitMessage.trim();
    if (!message) {
      setCommitError('Enter a commit message');
      return;
    }
    // When committing on current branch, do not send mode/branchName so backend stays on current
    const mode = commitOnCurrent ? undefined : commitMode;
    const branchName = commitOnCurrent ? undefined : (commitMode === 'new' ? newBranchName.trim() : selectedBranch.trim());
    if (!commitOnCurrent && commitMode === 'new' && !branchName) {
      setCommitError('Enter a new branch name');
      return;
    }
    if (!commitOnCurrent && commitMode === 'existing' && !branchName && isGitRepo) {
      setCommitError('Select a branch');
      return;
    }
    setCommitBusy(true);
    setCommitError('');
    try {
      const res = await window.cursovable.gitCommit({ folderPath: folder, message, ...(mode ? { mode } : {}), ...(branchName ? { branchName } : {}) });
      if (!res || res.ok === false) {
        throw new Error(res?.error || 'Commit failed');
      }
      if (res.message === 'No changes to commit') {
        alert('No changes to commit');
      } else {
        const br = res.branch || branchName || currentBranch || 'main';
        alert(`Committed to ${br}`);
      }
      setShowCommit(false);
    } catch (e) {
      setCommitError(e.message || String(e));
    } finally {
      setCommitBusy(false);
    }
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

  // Subscribe to preview and cursor logs
  useEffect(() => {
    const unsubV = window.cursovable.onViteLog((payload) => {
      appendSanitizedLogs(setViteLogs, payload);
    });
    const unsubC = window.cursovable.onCursorLog((payload) => {
      appendSanitizedLogs(setCursorLogs, payload);
    });
    return () => { try { unsubV && unsubV(); } catch {} try { unsubC && unsubC(); } catch {} };
  }, []);

  // Auto-scroll logs
  useEffect(() => { if (viteLogScroller.current) viteLogScroller.current.scrollTop = viteLogScroller.current.scrollHeight; }, [viteLogs]);
  useEffect(() => { if (cursorLogScroller.current) cursorLogScroller.current.scrollTop = cursorLogScroller.current.scrollHeight; }, [cursorLogs]);
  useEffect(() => { if (consoleLogScroller.current) consoleLogScroller.current.scrollTop = consoleLogScroller.current.scrollHeight; }, [consoleLogs]);

  // Capture webview console messages
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
        <div className="header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Left section - Back arrow */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button className="secondary" onClick={handleBack} title="Back" aria-label="Back">
              ←
            </button>
          </div>

          {/* Center section - Route search / navigation bar and Run/Stop actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '0 0 auto' }}>
            <button className="secondary" title="Reload app" aria-label="Reload app" onClick={() => {
              const wb = document.querySelector('webview');
              try { if (wb) wb.reload(); } catch {}
            }}>⟳</button>
            <input
              list="project-route-list"
              placeholder={projectType === 'html' ? '/, /about, /docs/intro' : '/, /api/hello, /dashboard'}
              value={routeQuery}
              onChange={(e) => setRouteQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') navigateToRoute(routeQuery || '/'); }}
              style={{ width: 300, padding: '6px 10px', borderRadius: 8, border: '1px solid #27354a', background: '#0b0f16', color: '#e6e6e6' }}
            />
            <datalist id="project-route-list">
              {routes.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
            {/* Run / Stop icons */}
            {!previewUrl && (
              <button onClick={startPreview} disabled={!folder || isStarting || isInstalling} title="Run">
                ▶
              </button>
            )}
            <button className="secondary" onClick={stopPreview} title="Stop">■</button>
          </div>

          {/* Right section - Viewport toggles and options menu */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button 
              className="secondary"
              title="Commit changes"
              onClick={openCommitModal}
              style={{ padding: '6px 10px' }}
            >
              💾 Commit
            </button>
            {/* Viewport toggles */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginRight: 8 }}>
              <button 
                className={viewportMode === 'desktop' ? 'primary' : 'secondary'}
                onClick={() => setViewportMode('desktop')}
                title="Desktop view"
                style={{ padding: '4px 8px', fontSize: '12px' }}
              >
                🖥️
              </button>
              <button 
                className={viewportMode === 'tablet' ? 'primary' : 'secondary'}
                onClick={() => setViewportMode('tablet')}
                title="Tablet view"
                style={{ padding: '4px 8px', fontSize: '12px' }}
              >
                📱
              </button>
              <button 
                className={viewportMode === 'phone' ? 'primary' : 'secondary'}
                onClick={() => setViewportMode('phone')}
                title="Phone view"
                style={{ padding: '4px 8px', fontSize: '12px' }}
              >
                📞
              </button>
            </div>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <button className="secondary" title="Options" onClick={(e) => {
                const menu = e.currentTarget.nextElementSibling;
                menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
              }}>⋮</button>
              <div style={{
                position: 'absolute',
                right: 0,
                top: '100%',
                marginTop: 4,
                background: '#0b0f16',
                border: '1px solid #27354a',
                borderRadius: 8,
                padding: 8,
                display: 'none',
                zIndex: 1000,
                minWidth: 200
              }}>
                <div style={{ marginBottom: 8, borderBottom: '1px solid #27354a', paddingBottom: 8 }}>
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: 4 }}>Open in Editor:</div>
                  <select
                    value={selectedEditor}
                    onChange={(e) => setSelectedEditor(e.target.value)}
                    style={{ 
                      width: '100%', 
                      padding: '4px 8px', 
                      borderRadius: 4, 
                      border: '1px solid #27354a', 
                      background: '#1a2331', 
                      color: '#e6e6e6',
                      fontSize: '12px'
                    }}
                    title="Choose editor"
                  >
                    <option value="">Select editor…</option>
                    {editors.map((id) => (
                      <option key={id} value={id}>{
                        ({ code: 'VS Code', cursor: 'Cursor', webstorm: 'WebStorm', idea: 'IntelliJ IDEA', subl: 'Sublime Text' }[id] || id)
                      }</option>
                    ))}
                  </select>
                  <button
                    style={{
                      width: '100%',
                      marginTop: 4,
                      padding: '4px 8px',
                      background: selectedEditor ? '#3c6df0' : '#374151',
                      border: 'none',
                      color: '#ffffff',
                      cursor: selectedEditor ? 'pointer' : 'not-allowed',
                      borderRadius: 4,
                      fontSize: '12px'
                    }}
                    disabled={!folder || !selectedEditor}
                    onClick={async () => { 
                      if (folder && selectedEditor) {
                        await window.cursovable.openInEditor({ folderPath: folder, editor: selectedEditor });
                        // Close menu after action
                        const menu = document.querySelector('[style*="zIndex: 1000"]');
                        if (menu) menu.style.display = 'none';
                      }
                    }}
                  >
                    Open in {selectedEditor ? ({ code: 'VS Code', cursor: 'Cursor', webstorm: 'WebStorm', idea: 'IntelliJ IDEA', subl: 'Sublime Text' }[selectedEditor] || selectedEditor) : 'Editor'}
                  </button>
                  {/* Preselect default editor from settings if available and not yet chosen */}
                  {selectedEditor === '' && (() => {
                    try {
                      const s = loadSettings();
                      if (s.defaultEditor && editors.includes(s.defaultEditor)) {
                        setSelectedEditor(s.defaultEditor);
                      }
                    } catch {}
                    return null;
                  })()}
                </div>
                <button
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '6px 8px',
                    background: 'transparent',
                    border: 'none',
                    color: previewUrl ? '#e6e6e6' : '#9ca3af',
                    cursor: previewUrl ? 'pointer' : 'not-allowed',
                    borderRadius: 4
                  }}
                  onMouseEnter={(e) => { if (previewUrl) e.target.style.background = '#1a2331' }}
                  onMouseLeave={(e) => e.target.style.background = 'transparent'}
                  disabled={!previewUrl}
                  onClick={async () => { 
                    if (previewUrl) {
                      // Ensure localhost URLs use HTTP protocol for browser compatibility
                      let urlToOpen = previewUrl;
                      try {
                        const url = new URL(previewUrl);
                        if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
                          url.protocol = 'http:';
                          urlToOpen = url.toString();
                        }
                      } catch (e) {
                        // If URL parsing fails, use original URL
                        urlToOpen = previewUrl;
                      }
                      await window.cursovable.openExternal(urlToOpen);
                      // Close menu after action
                      const menu = document.querySelector('[style*="zIndex: 1000"]');
                      if (menu) menu.style.display = 'none';
                    }
                  }}
                  title={previewUrl ? "Open preview in browser" : "Start preview to open in browser"}
                >
                  🌐 Open in browser
                </button>
                <button
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '6px 8px',
                    background: 'transparent',
                    border: 'none',
                    color: '#e6e6e6',
                    cursor: 'pointer',
                    borderRadius: 4,
                    marginTop: 4
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#1a2331'}
                  onMouseLeave={(e) => e.target.style.background = 'transparent'}
                  onClick={async () => { 
                    if (folder) await window.cursovable.openFolder(folder); 
                    // Close menu after action
                    const menu = document.querySelector('[style*="zIndex: 1000"]');
                    if (menu) menu.style.display = 'none';
                  }}
                  title="Open in file system"
                >
                  📁 Open in file system
                </button>
                <button
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '6px 8px',
                    background: 'transparent',
                    border: 'none',
                    color: '#e6e6e6',
                    cursor: 'pointer',
                    borderRadius: 4,
                    marginTop: 4
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#1a2331'}
                  onMouseLeave={(e) => e.target.style.background = 'transparent'}
                  onClick={() => {
                    setIsChatVisible(!isChatVisible);
                    // Close menu after action
                    const menu = document.querySelector('[style*="zIndex: 1000"]');
                    if (menu) menu.style.display = 'none';
                  }}
                  title={isChatVisible ? "Hide chat panel" : "Show chat panel"}
                >
                  💬 {isChatVisible ? 'Hide' : 'Show'} Chat
                </button>
                <button
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '6px 8px',
                    background: 'transparent',
                    border: 'none',
                    color: '#e6e6e6',
                    cursor: 'pointer',
                    borderRadius: 4,
                    marginTop: 4
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#1a2331'}
                  onMouseLeave={(e) => e.target.style.background = 'transparent'}
                  onClick={() => {
                    setShowDebug(v => !v);
                    const menu = document.querySelector('[style*="zIndex: 1000"]');
                    if (menu) menu.style.display = 'none';
                  }}
                  title="Debug"
                >
                  💻 {showDebug ? 'Hide' : 'Show'} Debug
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="iframe-wrap">
          {(!previewUrl && (isInstalling || isStarting)) ? (
            <div className="pv-loader">
              <div className="pv-spinner" />
              <div className="pv-text">
                {isInstalling ? 'Installing dependencies' : 'Loading project preview'}
                <span className="pv-pill">{projectType.toUpperCase()}</span>
                <div className="pv-sub">This may take a minute…</div>
              </div>
            </div>
          ) : previewUrl ? (
            <div style={{ 
              width: '100%', 
              height: '100%', 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: viewportMode === 'desktop' ? 'stretch' : 'center',
              backgroundColor: viewportMode === 'desktop' ? 'transparent' : '#0f172a',
              padding: viewportMode === 'desktop' ? 0 : '20px'
            }}>
              <webview 
                ref={webviewRef}
                src={previewUrl} 
                style={getViewportStyle()} 
                allowpopups="true" 
                disablewebsecurity="true" 
                webpreferences="contextIsolation, javascript=yes, webSecurity=no, allowRunningInsecureContent=yes" 
                partition="persist:default"
              />
            </div>
          ) : (
            <div style={{padding: 18, opacity: .7}}>
              {projectType === 'html' ? 'Click “Run HTML Server” to serve your static site with live reload.' : 'Click “Run Preview” to start your project.'}
            </div>
          )}
        </div>

        {showDebug && (
          <div className="debug-panel">
            <div className="tabs">
              <button className={activeTab==='vite'?'active':''} onClick={() => setActiveTab('vite')}>Preview</button>
              <button className={activeTab==='cursor'?'active':''} onClick={() => setActiveTab('cursor')}>Terminal</button>
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
                    <div style={{color: '#cde3ff', fontSize: '10px', marginBottom: '0px', opacity: 0.7}}>
                      Status: <span id="terminal-status">{terminalStatusText}</span>
                    </div>
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

      {rightPanelVisible && (
        <div className="panel chat">
          {showCommit ? (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div className="header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 600, color: '#cde3ff' }}>Commit Changes</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button variant="secondary" onClick={() => setShowCommit(false)}>Back to Chat</Button>
                  <Button onClick={performCommit} disabled={
                    commitBusy ||
                    !commitMessage.trim() ||
                    (!commitOnCurrent && (
                      (commitMode === 'existing' && !selectedBranch.trim()) ||
                      (commitMode === 'new' && !newBranchName.trim())
                    ))
                  }>
                    {commitBusy ? 'Committing…' : 'Commit'}
                  </Button>
                </div>
              </div>
              <div style={{ padding: 12, overflow: 'auto', flex: 1 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div style={{ gridColumn: '1 / span 2', fontSize: 12, color: '#c9d5e1' }}>
                    {isGitRepo === false ? 'No git repository detected. A repository will be initialized automatically.' : null}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: '1 / span 2' }}>
                    <Label>Commit Message</Label>
                    <Textarea className="hero-one-line" value={commitMessage} onChange={(e) => setCommitMessage(e.target.value)} placeholder="Describe your changes" rows={3} />
                  </div>
                  <div style={{ gridColumn: '1 / span 2', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0b0f16', border: '1px solid #27354a', borderRadius: 8, padding: '8px 10px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <div style={{ color: '#cde3ff', fontWeight: 600, fontSize: 12 }}>Commit on current branch</div>
                      <div style={{ color: '#9ca3af', fontSize: 11 }}>Enable to commit to {currentBranch ? `"${currentBranch}"` : 'the current branch'}</div>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="checkbox" checked={commitOnCurrent} onChange={(e) => setCommitOnCurrent(e.target.checked)} />
                      <span style={{ color: '#cde3ff' }}>{commitOnCurrent ? 'On' : 'Off'}</span>
                    </label>
                  </div>
                  {!commitOnCurrent && (
                    <>
                      <div style={{ gridColumn: '1 / span 2', display: 'flex', gap: 16, alignItems: 'center' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <input type="radio" name="commit-mode" checked={commitMode==='existing'} onChange={() => setCommitMode('existing')} />
                          <span>Use existing branch</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <input type="radio" name="commit-mode" checked={commitMode==='new'} onChange={() => setCommitMode('new')} />
                          <span>Create new branch</span>
                        </label>
                      </div>
                      {commitMode === 'existing' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: '1 / span 2' }}>
                          <Label>Branch</Label>
                          {branches.length > 0 ? (
                            <Select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)}>
                              {branches.map((b) => (
                                <option key={b} value={b}>{b}{currentBranch===b?' (current)':''}</option>
                              ))}
                            </Select>
                          ) : (
                            <Input value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)} placeholder="e.g. main" />
                          )}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: '1 / span 2' }}>
                          <Label>New Branch Name</Label>
                          <Input value={newBranchName} onChange={(e) => setNewBranchName(e.target.value)} placeholder="feature/my-change" />
                        </div>
                      )}
                    </>
                  )}
                  {commitError && (
                    <div style={{ color: '#ef4444', fontSize: 12, gridColumn: '1 / span 2' }}>{commitError}</div>
                  )}

                  {/* Restore local commits */}
                  <div style={{ gridColumn: '1 / span 2', marginTop: 6, borderTop: '1px solid #27354a', paddingTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ color: '#cde3ff', fontWeight: 600 }}>Restore local commits</div>
                    <Button variant="secondary" onClick={() => setShowRestore(v => !v)} disabled={hasUpstream} title={hasUpstream ? `Disabled: current branch tracks ${upstreamRef}` : undefined}>
                      {showRestore ? 'Hide' : 'Show'}
                    </Button>
                  </div>
                  {showRestore && !hasUpstream && (
                    <div style={{ gridColumn: '1 / span 2', display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                      <div style={{ color: '#9ca3af', fontSize: 12 }}>Select a previous local commit to restore from reflog.</div>
                      <div style={{ maxHeight: 220, overflow: 'auto', border: '1px solid #27354a', borderRadius: 8 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                          <thead>
                            <tr style={{ position: 'sticky', top: 0, background: '#0b0f16' }}>
                              <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #27354a' }}>SHA</th>
                              <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #27354a' }}>Date</th>
                              <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #27354a' }}>Message</th>
                              <th style={{ textAlign: 'right', padding: '8px 10px', borderBottom: '1px solid #27354a' }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reflogEntries.length === 0 ? (
                              <tr><td colSpan={4} style={{ padding: 10, color: '#9ca3af' }}>No entries</td></tr>
                            ) : (
                              reflogEntries.map((e) => (
                                <tr key={e.sha}>
                                  <td style={{ padding: '8px 10px', borderBottom: '1px solid #1d2633', fontFamily: 'ui-monospace, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' }}>{e.sha}</td>
                                  <td style={{ padding: '8px 10px', borderBottom: '1px solid #1d2633' }}>{e.date}</td>
                                  <td style={{ padding: '8px 10px', borderBottom: '1px solid #1d2633' }}>{e.message}</td>
                                  <td style={{ padding: '8px 10px', borderBottom: '1px solid #1d2633', textAlign: 'right', display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                    <Button className="compact" variant="secondary" disabled={restoreBusy} onClick={async () => {
                                      if (!confirm('Reset current branch to this commit? This is destructive and is blocked if the branch tracks a remote.')) return;
                                      setRestoreBusy(true); setRestoreError('');
                                      try {
                                        const res = await window.cursovable.restoreLocalCommit({ folderPath: folder, action: 'reset-hard', sha: e.sha });
                                        if (!res || res.ok === false) throw new Error(res?.error || 'Failed');
                                        alert(`Branch ${res.branch || ''} reset to ${e.sha}`);
                                        setShowCommit(false);
                                      } catch (err) {
                                        setRestoreError(err.message || String(err));
                                      } finally { setRestoreBusy(false); }
                                    }}>Reset</Button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button variant="secondary" onClick={async () => {
                          try {
                            const r = await window.cursovable.getReflog({ folderPath: folder, limit: 50 });
                            if (r && r.ok) setReflogEntries(r.entries || []);
                          } catch {}
                        }}>Refresh</Button>
                      </div>
                      {restoreError && (
                        <div style={{ color: '#ef4444', fontSize: 12 }}>{restoreError}</div>
                      )}
                    </div>
                  )}
                  {showRestore && hasUpstream && (
                    <div style={{ gridColumn: '1 / span 2', padding: 12, border: '1px solid #27354a', borderRadius: 8, background: '#0b0f16', color: '#c9d5e1', fontSize: 12 }}>
                      Restore is disabled because the current branch tracks {upstreamRef || 'a remote branch'}. To avoid conflicts with other developers, resetting pushed history is blocked. Create and switch to a local branch with no upstream to enable restore.
                    </div>
                  )}
                </div>
              </div>
            </div>
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


