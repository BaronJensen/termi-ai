import React, { useState, useEffect } from 'react';

function ProjectPreview({
  previewUrl,
  isInstalling,
  isStarting,
  projectType,
  viewportMode,
  webviewRef,
  getViewportStyle,
  showMiniGame,
  onCloseMiniGame
}) {
  const [isGameLoading, setIsGameLoading] = useState(true);
  const [gameLoadError, setGameLoadError] = useState(false);

  if (showMiniGame) {
    return (
      <div className="iframe-wrap mini-game-container" style={{ position: 'relative' }}>
        
        {isGameLoading && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 5,
            textAlign: 'center',
            color: '#e6e6e6'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '4px solid #1a2331',
              borderTop: '4px solid #3c6df0',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px auto'
            }}></div>
            <div style={{ fontSize: '16px', fontWeight: '600' }}>Loading Snake Game...</div>
          </div>
        )}
        
        {gameLoadError && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 5,
            textAlign: 'center',
            color: '#ef4444'
          }}>
            <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
              🚫 Failed to load Snake Game
            </div>
            <button
              onClick={() => {
                setGameLoadError(false);
                setIsGameLoading(true);
                // Force iframe reload
                const iframe = document.querySelector('iframe[title="Snake Mini-Game"]');
                if (iframe) {
                  iframe.src = iframe.src;
                }
              }}
              style={{
                padding: '8px 16px',
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Retry
            </button>
          </div>
        )}
        
        <iframe
          src="/snake-game.html"
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            borderRadius: '12px',
            backgroundColor: '#0f172a',
            opacity: isGameLoading ? 0 : 1,
            transition: 'opacity 0.3s ease'
          }}
          title="Snake Mini-Game"
          onLoad={() => {
            console.log('🎮 Snake game iframe loaded successfully');
            setIsGameLoading(false);
          }}
          onError={() => {
            console.error('🚫 Snake game iframe failed to load');
            setIsGameLoading(false);
            setGameLoadError(true);
          }}
        />
      </div>
    );
  }

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
