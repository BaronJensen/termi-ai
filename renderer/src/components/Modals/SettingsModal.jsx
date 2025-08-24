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

  // Available AI models for cursor-agent
  const availableModels = [
    'gpt-5',
    'gpt-5-fast',
    'sonnet-4',
    'sonnet-4-thinking',
    'gpt-4.1',
    'gpt-4.1-mini'
  ];

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await window.cursovable.detectEditors();
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
      <Button onClick={() => onSave({ cursorAgentTimeoutMs: parsedTimeout, defaultEditor: editor, packageManager: pkgMgr, apiKey, defaultModel })}>
        Save
      </Button>
    </>
  );

  return (
    <Modal title="Settings" onClose={onClose} footer={footer}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={{ gridColumn: '1 / span 2', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Label>Cursor Agent Timeout</Label>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Label>Default AI Model</Label>
          <Select value={defaultModel} onChange={(e) => setDefaultModel(e.target.value)}>
            <option value="">Auto (default)</option>
            {availableModels.map((model) => (
              <option key={model} value={model}>{model}</option>
            ))}
          </Select>
          <div style={{ fontSize: 11, color: '#9ca3af' }}>Leave empty to let cursor-agent choose automatically</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: '1 / span 2' }}>
          <Label>API Key (Optional)</Label>
          <Input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your OpenAI API key..."
          />
          <div style={{ fontSize: 11, color: '#9ca3af' }}>Used for cursor-agent authentication. Leave empty if not needed.</div>
        </div>
      </div>
    </Modal>
  );
}

export default SettingsModal;
