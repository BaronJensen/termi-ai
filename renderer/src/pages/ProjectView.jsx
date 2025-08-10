import React, { useState } from 'react';
import Chat from '../components/Chat.jsx';
import { getProject, updateProject } from '../store/projects';

export default function ProjectView({ projectId, onBack }) {
  const project = getProject(projectId);
  const [folder, setFolder] = useState(project?.path || null);
  const [timeoutMinutes, setTimeoutMinutes] = useState(15);
  const [apiKey, setApiKey] = useState('');
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isStarting, setIsStarting] = useState(false);

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
    setIsStarting(true);
    try {
      const { url } = await window.cursovable.startVite({ folderPath: folder, manager: 'yarn' });
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

  return (
    <div className="app" style={{ gridTemplateColumns: '1.6fr 0.8fr' }}>
      <div className="panel">
        <div className="header">
          <button className="secondary" onClick={onBack}>Back</button>
          <input style={{minWidth: '280px'}} value={folder || ''} placeholder="No folder selected" readOnly />
          <button onClick={startPreview} disabled={!folder || isStarting}>Run Preview</button>
          <button className="secondary" onClick={stopPreview}>Stop</button>
        </div>
        <div className="iframe-wrap">
          {previewUrl ? (
            <webview src={previewUrl} style={{width:'100%', height:'100%'}} allowpopups="true" disablewebsecurity="true" webpreferences="contextIsolation, javascript=yes, webSecurity=no, allowRunningInsecureContent=yes" partition="persist:default"/>
          ) : (
            <div style={{padding: 18, opacity: .7}}>Click “Run Preview” to start your project.</div>
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
        <Chat apiKey={apiKey} cwd={folder} timeoutMinutes={timeoutMinutes} />
      </div>
    </div>
  );
}


