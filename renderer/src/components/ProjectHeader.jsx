import React, { useEffect, useRef } from 'react';
import { loadSettings } from '../store/settings';

function ProjectHeader({
  projectType,
  routeQuery,
  setRouteQuery,
  routes,
  navigateToRoute,
  previewUrl,
  folder,
  isStarting,
  isInstalling,
  startPreview,
  stopPreview,
  openCommitModal,
  viewportMode,
  setViewportMode,
  selectedEditor,
  setSelectedEditor,
  editors,
  isChatVisible,
  setIsChatVisible,
  showDebug,
  setShowDebug,
  onBack
}) {
  const menuRef = useRef(null);

  // Helper function to close the menu
  const closeMenu = () => {
    const menu = menuRef.current?.querySelector('[style*="zIndex: 1000"]');
    if (menu) menu.style.display = 'none';
  };

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        closeMenu();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  return (
    <div className="header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      {/* Left section - Back arrow */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button className="secondary" onClick={onBack} title="Back" aria-label="Back">
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
        <div ref={menuRef} style={{ position: 'relative', display: 'inline-block' }}>
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
                onChange={(e) => {
                  setSelectedEditor(e.target.value);
                  // Close menu after selection
                  closeMenu();
                }}
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
                    closeMenu();
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
                  closeMenu();
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
                closeMenu();
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
                closeMenu();
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
                closeMenu();
              }}
              title="Debug"
            >
              💻 {showDebug ? 'Hide' : 'Show'} Debug
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProjectHeader;
