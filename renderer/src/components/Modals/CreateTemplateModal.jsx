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
  const [permissionStatus, setPermissionStatus] = useState(null);
  const [checkingPermissions, setCheckingPermissions] = useState(false);
  const [fixingPermissions, setFixingPermissions] = useState(false);

  async function browseParent() {
    const fp = await window.termiAI.selectFolder();
    if (fp) {
      setParentDir(fp);
      setPermissionStatus(null); // Reset permission status when folder changes
    }
  }

  async function checkPermissions() {
    if (!parentDir) return;
    
    try {
      setCheckingPermissions(true);
      setError('');
      const result = await window.termiAI.checkDirectoryPermissions({ directoryPath: parentDir });
      setPermissionStatus(result);
    } catch (err) {
      setError(`Failed to check permissions: ${err.message}`);
    } finally {
      setCheckingPermissions(false);
    }
  }

  async function fixPermissions() {
    if (!parentDir) return;
    
    try {
      setFixingPermissions(true);
      setError('');
      const result = await window.termiAI.fixDirectoryPermissions({ directoryPath: parentDir });
      if (result.ok) {
        // Re-check permissions after fixing
        await checkPermissions();
      } else {
        setError(`Failed to fix permissions: ${result.error}`);
      }
    } catch (err) {
      setError(`Failed to fix permissions: ${err.message}`);
    } finally {
      setFixingPermissions(false);
    }
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
      
      // Check permissions before creating project
      const permCheck = await window.termiAI.checkDirectoryPermissions({ directoryPath: parentDir });
      if (!permCheck.ok) {
        throw new Error(`Permission check failed: ${permCheck.error}`);
      }
      
      if (!permCheck.permissions.createFiles || !permCheck.permissions.deleteFiles) {
        throw new Error(`Insufficient permissions in selected folder. The folder needs read/write access for cursor-agent to work properly. Current permissions: ${permCheck.permissions.mode}`);
      }
      
      const res = await window.termiAI.createProjectScaffold({ parentDir, projectName: projectName.trim(), template, prompt });
      if (!res || !res.ok) throw new Error(res?.error || 'Failed to create project');
      
      const projectPath = res.path;
      
      // Verify the created project has proper permissions
      const projectPermCheck = await window.termiAI.checkDirectoryPermissions({ directoryPath: projectPath });
      if (!projectPermCheck.ok || !projectPermCheck.permissions.createFiles) {
        throw new Error(`Project created but cursor-agent may not have sufficient permissions to work in: ${projectPath}. Please check folder permissions.`);
      }
      
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
        <div style={{ alignSelf: 'end', display: 'flex', gap: 8 }}>
          <Button onClick={checkPermissions} disabled={!parentDir || checkingPermissions} style={{ minWidth: 100 }}>
            {checkingPermissions ? 'Checking...' : 'Check Perms'}
          </Button>
          <Button onClick={browseParent} style={{ minWidth: 120 }}>Browse…</Button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: '1 / span 2' }}>
          <Label>Project Name</Label>
          <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="my-new-project" />
        </div>
        
        {permissionStatus && (
          <div style={{ gridColumn: '1 / span 2' }}>
            <div style={{ 
              background: permissionStatus.ok && permissionStatus.permissions.createFiles ? '#065f46' : '#7f1d1d', 
              padding: 12, 
              borderRadius: 6, 
              border: '1px solid #374151',
              fontSize: 11
            }}>
              <div style={{ fontWeight: 600, marginBottom: 6, color: '#e5e7eb' }}>
                Permission Status: {permissionStatus.ok && permissionStatus.permissions.createFiles ? '✅ Ready' : '❌ Issues Found'}
              </div>
              {permissionStatus.ok && (
                <div style={{ color: '#9ca3af', lineHeight: 1.4 }}>
                  <div>Mode: {permissionStatus.permissions.mode}</div>
                  <div>Read: {permissionStatus.permissions.read ? '✅' : '❌'}</div>
                  <div>Write: {permissionStatus.permissions.write ? '✅' : '❌'}</div>
                  <div>Create Files: {permissionStatus.permissions.createFiles ? '✅' : '❌'}</div>
                  <div>Delete Files: {permissionStatus.permissions.deleteFiles ? '✅' : '❌'}</div>
                </div>
              )}
              {!permissionStatus.ok && (
                <div style={{ color: '#fca5a5' }}>
                  {permissionStatus.error}
                </div>
              )}
              {permissionStatus.ok && !permissionStatus.permissions.createFiles && (
                <div style={{ marginTop: 8 }}>
                  <Button 
                    onClick={fixPermissions} 
                    disabled={fixingPermissions}
                    variant="secondary"
                    style={{ fontSize: 11, padding: '4px 8px' }}
                  >
                    {fixingPermissions ? 'Fixing...' : '🔧 Fix Permissions (macOS)'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
        {error && (
          <div style={{ color: '#ef4444', fontSize: 12, gridColumn: '1 / span 2' }}>
            <div style={{ marginBottom: 8 }}>{error}</div>
            {error.includes('permission') && (
              <div style={{ 
                background: '#1f2937', 
                padding: 12, 
                borderRadius: 6, 
                border: '1px solid #374151',
                fontSize: 11
              }}>
                <div style={{ fontWeight: 600, marginBottom: 6, color: '#e5e7eb' }}>Permission Troubleshooting:</div>
                <div style={{ color: '#9ca3af', lineHeight: 1.4 }}>
                  • <strong>macOS:</strong> Right-click the folder → Get Info → Sharing & Permissions → Add your user with Read & Write access
                  <br/>• <strong>Linux:</strong> Run <code style={{ background: '#374151', padding: '2px 4px', borderRadius: 3 }}>chmod 755</code> on the folder
                  <br/>• <strong>Windows:</strong> Right-click folder → Properties → Security → Edit → Add your user with Full control
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

export default CreateTemplateModal;
