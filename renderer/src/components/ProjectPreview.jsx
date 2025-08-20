import React from 'react';

function ProjectPreview({
  previewUrl,
  isInstalling,
  isStarting,
  projectType,
  viewportMode,
  webviewRef,
  getViewportStyle
}) {
  return (
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
          {projectType === 'html' ? 'Click "Run HTML Server" to serve your static site with live reload.' : 'Click "Run Preview" to start your project.'}
        </div>
      )}
    </div>
  );
}

export default ProjectPreview;
