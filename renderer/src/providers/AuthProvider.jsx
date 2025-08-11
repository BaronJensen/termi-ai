import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { loadSettings, saveSettings } from '../store/settings';

const AuthContext = createContext({
  loggedIn: null,
  showLogin: false,
  authLink: '',
  refreshStatus: async () => {},
  openLogin: () => {},
  triggerLogin: async () => {},
  closeLogin: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }) {
  const [loggedIn, setLoggedIn] = useState(null); // null | boolean
  const [showLogin, setShowLogin] = useState(false);
  const [authLink, setAuthLink] = useState('');
  const [authLogs, setAuthLogs] = useState([]);
  const openedRef = useRef(false);
  const [apiKeyDraft, setApiKeyDraft] = useState(() => loadSettings().apiKey || '');
  const [useApiKeyLogin, setUseApiKeyLogin] = useState(false);

  const refreshStatus = async () => {
    try {
      // If API key exists, treat as logged in via token auth
      const s = loadSettings();
      if (s && s.apiKey && String(s.apiKey).trim()) {
        setLoggedIn(true);
        setShowLogin(false);
        return true;
      }
      const status = await window.cursovable.getCursorAuthStatus?.();
      const isIn = !!(status && status.loggedIn);
      setLoggedIn(isIn);
      if (!isIn) setShowLogin(true);
      return isIn;
    } catch {
      setLoggedIn(false);
      setShowLogin(true);
      return false;
    }
  };

  const openLogin = () => setShowLogin(true);

  const triggerLogin = async () => {
    try {
      if (useApiKeyLogin && apiKeyDraft.trim()) {
        // Save API key to settings and mark as logged in for token flow
        const merged = saveSettings({ ...loadSettings(), apiKey: apiKeyDraft.trim() });
        setApiKeyDraft(merged.apiKey || '');
        setLoggedIn(true);
        setShowLogin(false);
        return;
      }
      await window.cursovable.triggerCursorAuthLogin?.();
      const isIn = await refreshStatus();
      if (isIn) setShowLogin(false);
    } catch {}
  };

  const closeLogin = async () => {
    // Treat cancel as restart of the logged-out flow from the start
    try {
      setAuthLink('');
      setAuthLogs([]);
      openedRef.current = false;
      setShowLogin(true);
      await refreshStatus();
    } catch {}
  };

  // Initial status check
  useEffect(() => { refreshStatus(); }, []);

  // Subscribe to auth link/log streams
  useEffect(() => {
    const unsubLog = window.cursovable.onCursorAuthLog?.((payload) => {
      setAuthLogs((prev) => {
        const next = [...prev, { ts: payload.ts || Date.now(), line: String(payload.line || '') }];
        return next.length > 500 ? next.slice(-500) : next;
      });
    });
    const unsubLink = window.cursovable.onCursorAuthLink?.(async ({ url }) => {
      if (!url) return;
      setAuthLink(url);
      if (!openedRef.current) {
        openedRef.current = true;
        try { await window.cursovable.openExternal(url); } catch {}
      }
    });
    return () => { try { unsubLog && unsubLog(); } catch {} try { unsubLink && unsubLink(); } catch {} };
  }, []);

  const value = useMemo(() => ({ loggedIn, showLogin, authLink, refreshStatus, openLogin, triggerLogin, closeLogin }), [loggedIn, showLogin, authLink]);

  return (
    <AuthContext.Provider value={value}>
      {children}
      {showLogin && (
        <Modal
          title="Authenticate"
          onClose={closeLogin}
          hideClose
          footer={(
            <>
              <Button variant="secondary" onClick={closeLogin}>Cancel</Button>
              {!authLink && (
                <>
                  <Button variant={useApiKeyLogin ? 'ghost' : 'primary'} onClick={() => { setUseApiKeyLogin(false); setTimeout(triggerLogin, 0); }} style={{ minWidth: 140 }}>
                    Quick Login
                  </Button>
                  <Button onClick={() => setUseApiKeyLogin(true)} style={{ minWidth: 140 }}>
                    API Key Login
                  </Button>
                </>
              )}
            </>
          )}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {!useApiKeyLogin && (
              <div style={{ color: '#c9d5e1', fontSize: 13 }}>
                You are logged out. Click “Quick Login” to run <code>cursor-agent login</code> and approve in your browser, or use an API key below.
              </div>
            )}
            <div style={{ display: useApiKeyLogin ? 'flex' : 'none', flexDirection: 'column', gap: 8 }}>
              <div style={{ color: '#c9d5e1', fontSize: 13 }}>Enter your API key (stored locally; used for token auth)</div>
              <Input type="password" value={apiKeyDraft} onChange={(e) => setApiKeyDraft(e.target.value)} placeholder="Enter API Key" />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <Button variant="secondary" onClick={() => setUseApiKeyLogin(false)}>Back</Button>
                <Button onClick={triggerLogin} disabled={!apiKeyDraft.trim()} style={{ minWidth: 140 }}>Use API Key</Button>
              </div>
            </div>
            <div style={{ fontSize: 12, color: '#9ca3af' }}>
              Learn more in the <a href="#" onClick={async (e) => { e.preventDefault(); try { await window.cursovable.openExternal('https://docs.cursor.com/en/cli/overview'); } catch {} }} style={{ color: '#93c5fd', textDecoration: 'underline' }}>Cursor CLI docs</a>.
            </div>
            {authLink && (
              <div style={{ fontSize: 12, background: '#0b0f16', border: '1px solid #27354a', borderRadius: 6, padding: 10 }}>
                <div style={{ color: '#cde3ff', marginBottom: 6 }}>Authentication link</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Input value={authLink} readOnly />
                  <Button className="compact" onClick={async () => { try { await window.cursovable.openExternal(authLink); } catch {} }}>Open</Button>
                </div>
                {/* Spinner + Waiting text */}
                <style>{`@keyframes auth-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(205,227,255,.25)', borderTopColor: '#3c6df0', animation: 'auth-spin 1s linear infinite' }} />
                  <div style={{ color: '#c9d5e1' }}>Waiting for access</div>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </AuthContext.Provider>
  );
}


