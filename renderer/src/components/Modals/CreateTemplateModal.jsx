import React, { useState } from 'react';
import Button from '../../ui/Button';
import Modal from '../../ui/Modal';
import Input from '../../ui/Input';
import Label from '../../ui/Label';

function CreateTemplateModal({ onClose, onCreate, initialTemplate = 'react-vite', initialPrompt = '' }) {
  const [parentDir, setParentDir] = useState('');
  const [projectName, setProjectName] = useState('');
  const [template] = useState(initialTemplate);
  const [prompt] = useState(initialPrompt);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function browseParent() {
    const fp = await window.cursovable.selectFolder();
    if (fp) setParentDir(fp);
  }

  function computeProjectType(tpl) {
    if (tpl === 'react-vite' || tpl === 'vue-vite') return 'vite';
    if (tpl === 'next') return 'next';
    return 'html';
  }

  async function submit() {
    try {
      setBusy(true);
      setError('');
      if (!parentDir || !projectName.trim()) throw new Error('Choose folder and enter project name');
      const res = await window.cursovable.createProjectScaffold({ parentDir, projectName: projectName.trim(), template, prompt });
      if (!res || !res.ok) throw new Error(res?.error || 'Failed to create project');
      const projectPath = res.path;
      const projectType = computeProjectType(template);
      const runningScript = projectType === 'html' ? '' : 'npm run dev';
      const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      onCreate({
        id,
        name: projectName.trim(),
        description: `Created from ${template}`,
        path: projectPath,
        image: '',
        runningConfig: { projectType, runningScript },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Create Project • Choose Folder & Name"
      onClose={onClose}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={busy || !parentDir || !projectName.trim()} style={{ minWidth: 140 }}>
            {busy ? 'Creating…' : 'Create'}
          </Button>
        </>
      )}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: '1 / span 2' }}>
          <Label>Template</Label>
          <Input value={initialTemplate} readOnly />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: '1 / span 2' }}>
          <Label>Prompt</Label>
          <Input value={initialPrompt} readOnly />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Label>Parent Folder</Label>
          <Input value={parentDir} placeholder="/choose/parent/folder" readOnly />
        </div>
        <div style={{ alignSelf: 'end' }}>
          <Button onClick={browseParent} style={{ minWidth: 120 }}>Browse…</Button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: '1 / span 2' }}>
          <Label>Project Name</Label>
          <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="my-new-project" />
        </div>
        {error && (
          <div style={{ color: '#ef4444', fontSize: 12, gridColumn: '1 / span 2' }}>{error}</div>
        )}
      </div>
    </Modal>
  );
}

export default CreateTemplateModal;
