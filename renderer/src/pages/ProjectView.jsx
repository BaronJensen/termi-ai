import React, { useEffect, useRef, useState } from 'react';
import Chat from '../components/Chat.jsx';
import { getProject, updateProject } from '../store/projects';

export default function ProjectView({ projectId, onBack, initialMessage }) {
  const project = getProject(projectId);
  const [folder, setFolder] = useState(project?.path || null);
  const [timeoutMinutes, setTimeoutMinutes] = useState(15);
  const [apiKey, setApiKey] = useState('');
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const projectType = project?.runningConfig?.projectType || 'vite';
  const autoStartedRef = useRef(false);

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
          const res = await window.cursovable.installPackages({ folderPath: folder, manager: 'yarn' });
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
        urlObj = await window.cursovable.startVite({ folderPath: folder, manager: 'yarn' });
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

  return (
    <div className="app" style={{ gridTemplateColumns: '1.6fr 0.8fr' }}>
      <div className="panel">
        <div className="header">
          <button className="secondary" onClick={handleBack}>Back</button>
          <input style={{minWidth: '280px'}} value={folder || ''} placeholder="No folder selected" readOnly />
          <button onClick={startPreview} disabled={!folder || isStarting || isInstalling}>
            {isInstalling ? 'Installing…' : (projectType === 'html' ? 'Run HTML Server' : 'Run Preview')}
          </button>
          <button className="secondary" onClick={stopPreview}>Stop</button>
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
            <webview src={previewUrl} style={{width:'100%', height:'100%'}} allowpopups="true" disablewebsecurity="true" webpreferences="contextIsolation, javascript=yes, webSecurity=no, allowRunningInsecureContent=yes" partition="persist:default"/>
          ) : (
            <div style={{padding: 18, opacity: .7}}>
              {projectType === 'html' ? 'Click “Run HTML Server” to serve your static site with live reload.' : 'Click “Run Preview” to start your project.'}
            </div>
          )}
        </div>
      </div>

      <div className="panel chat">
        <div className="header">
          <input placeholder="Optional API key" value={apiKey} onChange={e => setApiKey(e.target.value)} style={{flex: 1}}/>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
            <label>Timeout:</label>
            <select value={timeoutMinutes} onChange={e => setTimeoutMinutes(Number(e.target.value))} style={{ padding: '2px 4px', fontSize: '11px' }}>
              <option value={5}>5 min</option>
              <option value={10}>10 min</option>
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
              <option value={60}>60 min</option>
              <option value={0}>No limit</option>
            </select>
          </div>
        </div>

        {/** Default chat instance; session id derived from assistant response for reconnecting later */}
        <Chat apiKey={apiKey} cwd={folder} timeoutMinutes={timeoutMinutes} initialMessage={initialMessage} />
      </div>
    </div>
  );
}


