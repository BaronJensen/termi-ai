import React, { useEffect, useMemo, useState } from 'react';
import Button from '../../ui/Button';
import Modal from '../../ui/Modal';
import Select from '../../ui/Select';
import Label from '../../ui/Label';
import Input from '../../ui/Input';

function SettingsModal({ initial, onClose, onSave }) {
  // Timeout minutes selector: 5, 10, 15, 30, infinite (0ms)
  const ms = typeof initial?.cursorAgentTimeoutMs === 'number' ? initial.cursorAgentTimeoutMs : 900000;
  const initialChoice = ms === 0 ? 'infinite' : (['5','10','15','30'].includes(String(Math.round(ms / 60000))) ? String(Math.round(ms / 60000)) : '15');
  const [timeoutChoice, setTimeoutChoice] = useState(initialChoice);

  const [editor, setEditor] = useState(initial?.defaultEditor || '');
  const [pkgMgr, setPkgMgr] = useState(initial?.packageManager || 'yarn');
  const [availableEditors, setAvailableEditors] = useState([]);
  const [apiKey, setApiKey] = useState(initial?.apiKey || '');
  const [defaultModel, setDefaultModel] = useState(initial?.defaultModel || '');

  // Multi-provider settings
  const [defaultProvider, setDefaultProvider] = useState(initial?.defaultProvider || 'cursor');
  const [cursorApiKey, setCursorApiKey] = useState(initial?.providerApiKeys?.cursor || initial?.apiKey || '');
  const [claudeApiKey, setClaudeApiKey] = useState(initial?.providerApiKeys?.claude || '');
  const [codexApiKey, setCodexApiKey] = useState(initial?.providerApiKeys?.codex || '');
  const [cursorModel, setCursorModel] = useState(initial?.providerModels?.cursor || initial?.defaultModel || '');
  const [claudeModel, setClaudeModel] = useState(initial?.providerModels?.claude || 'claude-3-5-sonnet-20241022');
  const [codexModel, setCodexModel] = useState(initial?.providerModels?.codex || 'gpt-5-codex');

  // Available AI models for cursor-agent
  const availableModels = [
    'gpt-5',
    'gpt-5-fast',
    'sonnet-4',
    'sonnet-4-thinking',
    'gpt-4.1',
    'gpt-4.1-mini'
  ];

  // Available models for Claude
  const claudeModels = [
    'claude-3-5-sonnet-20241022',
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
    'claude-3-haiku-20240307'
  ];

  // Available models for Codex
  const codexModels = [
    'gpt-5-codex',
    'gpt-5'
  ];

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await window.termiAI.detectEditors();
        if (mounted && Array.isArray(list)) setAvailableEditors(list);
      } catch {
        if (mounted) setAvailableEditors([]);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const parsedTimeout = useMemo(() => {
    if (timeoutChoice === 'infinite') return 0;
    const mins = parseInt(timeoutChoice, 10);
    return Number.isFinite(mins) && mins > 0 ? mins * 60000 : 900000;
  }, [timeoutChoice]);

  const formatEditorLabel = (id) => ({
    code: 'VS Code',
    cursor: 'Cursor',
    webstorm: 'WebStorm',
    idea: 'IntelliJ IDEA',
    subl: 'Sublime Text'
  }[id] || id);

  const footer = (
    <>
      <Button variant="secondary" onClick={onClose}>Cancel</Button>
      <Button onClick={() => onSave({
        cursorAgentTimeoutMs: parsedTimeout,
        defaultEditor: editor,
        packageManager: pkgMgr,
        apiKey: cursorApiKey, // Legacy field, use cursor API key
        defaultModel: cursorModel, // Legacy field, use cursor model
        defaultProvider,
        providerApiKeys: {
          cursor: cursorApiKey,
          claude: claudeApiKey,
          codex: codexApiKey
        },
        providerModels: {
          cursor: cursorModel,
          claude: claudeModel,
          codex: codexModel
        }
      })}>
        Save
      </Button>
    </>
  );

  return (
    <Modal title="Settings" onClose={onClose} footer={footer}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxHeight: '70vh', overflow: 'auto' }}>
        {/* General Settings */}
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#e6e6e6', marginBottom: 12, marginTop: 0 }}>General Settings</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ gridColumn: '1 / span 2', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Label>Agent Timeout</Label>
              <Select value={timeoutChoice} onChange={(e) => setTimeoutChoice(e.target.value)}>
                <option value="5">5 minutes</option>
                <option value="10">10 minutes</option>
                <option value="15">15 minutes (default)</option>
                <option value="30">30 minutes</option>
                <option value="infinite">Infinite</option>
              </Select>
              <div style={{ fontSize: 11, color: '#9ca3af' }}>Infinite disables the overall timeout. Idle timeout still applies.</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Label>Default Editor</Label>
              <Select value={editor} onChange={(e) => setEditor(e.target.value)}>
                <option value="">Ask each time…</option>
                {availableEditors.map((id) => (
                  <option key={id} value={id}>{formatEditorLabel(id)}</option>
                ))}
              </Select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Label>Default Package Manager</Label>
              <Select value={pkgMgr} onChange={(e) => setPkgMgr(e.target.value)}>
                <option value="yarn">yarn</option>
                <option value="npm">npm</option>
                <option value="pnpm">pnpm</option>
              </Select>
            </div>
          </div>
        </div>

        {/* AI Provider Settings */}
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#e6e6e6', marginBottom: 12, marginTop: 0 }}>AI Provider Settings</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
            <Label>Default Provider</Label>
            <Select value={defaultProvider} onChange={(e) => setDefaultProvider(e.target.value)}>
              <option value="cursor">⚡ Cursor AI</option>
              <option value="claude">🤖 Claude Code</option>
              <option value="codex">🔥 OpenAI Codex</option>
            </Select>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>Choose which AI agent to use by default for new sessions</div>
          </div>
        </div>

        {/* Cursor Settings */}
        <div style={{ backgroundColor: '#0f1419', padding: 12, borderRadius: 8, border: '1px solid #1d2633' }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: '#3b82f6', marginBottom: 10, marginTop: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            ⚡ Cursor AI Configuration
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Label>Model</Label>
              <Select value={cursorModel} onChange={(e) => setCursorModel(e.target.value)}>
                <option value="">Auto (default)</option>
                {availableModels.map((model) => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </Select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Label>API Key (Optional)</Label>
              <Input
                type="password"
                value={cursorApiKey}
                onChange={(e) => setCursorApiKey(e.target.value)}
                placeholder="Optional..."
              />
            </div>
          </div>
          <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 8 }}>Leave API key empty if using Cursor app authentication</div>
        </div>

        {/* Claude Settings */}
        <div style={{ backgroundColor: '#0f1419', padding: 12, borderRadius: 8, border: '1px solid #1d2633' }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: '#f97316', marginBottom: 10, marginTop: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            🤖 Claude Code Configuration
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Label>Model</Label>
              <Select value={claudeModel} onChange={(e) => setClaudeModel(e.target.value)}>
                {claudeModels.map((model) => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </Select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Label>API Key (Optional)</Label>
              <Input
                type="password"
                value={claudeApiKey}
                onChange={(e) => setClaudeApiKey(e.target.value)}
                placeholder="Optional..."
              />
            </div>
          </div>
          <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 8 }}>Leave empty if already authenticated with Claude Code CLI</div>
        </div>

        {/* Codex Settings */}
        <div style={{ backgroundColor: '#0f1419', padding: 12, borderRadius: 8, border: '1px solid #1d2633' }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: '#10b981', marginBottom: 10, marginTop: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            🔥 OpenAI Codex Configuration
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Label>Model</Label>
              <Select value={codexModel} onChange={(e) => setCodexModel(e.target.value)}>
                {codexModels.map((model) => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </Select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Label>API Key (Optional)</Label>
              <Input
                type="password"
                value={codexApiKey}
                onChange={(e) => setCodexApiKey(e.target.value)}
                placeholder="Optional..."
              />
            </div>
          </div>
          <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 8 }}>Leave empty if already authenticated with OpenAI CLI</div>
        </div>
      </div>
    </Modal>
  );
}

export default SettingsModal;
