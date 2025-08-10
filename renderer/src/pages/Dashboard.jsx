import React, { useEffect, useMemo, useState } from 'react';
import { loadProjects, addProject, removeProject } from '../store/projects';
import useDesignSystemStyles from '../ui/useDesignSystemStyles';
import Button from '../ui/Button';
import IconButton from '../ui/IconButton';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Label from '../ui/Label';
import Badge from '../ui/Badge';
import Card from '../ui/Card';
import Modal from '../ui/Modal';

function NewProjectModal({ onClose, onCreate }) {
  const [draft, setDraft] = useState({
    name: '',
    description: '',
    path: '',
    runningConfig: { projectType: 'vite', runningScript: 'npm run dev' },
  });
  const canCreate = useMemo(() => draft.name.trim() && draft.path.trim(), [draft]);
  
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        if (canCreate) submit();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [canCreate]);

  const [step, setStep] = useState(1);
  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState('');
  const [detected, setDetected] = useState(null);

  async function detectAndPrefill(fp) {
    setDetectError('');
    setDetecting(true);
    try {
      const res = await window.cursovable.detectProject(fp);
      if (!res || !res.ok) {
        throw new Error(res?.error || 'Failed to detect project');
      }
      const data = res.data || {};
      setDetected(data);

      if (!data.hasPackageJson && !data.hasIndexHtml) {
        setDetectError('No package.json or index.html found in the selected folder.');
        return;
      }

      // Choose default script strictly from package.json based on detection
      const scripts = data.scripts || {};
      const defaultKey = data.defaultScriptKey || null;
      const defaultCmd = defaultKey ? `npm run ${defaultKey}` : '';

      setDraft((d) => ({
        ...d,
        path: fp,
        name: data.name || d.name,
        description: data.description || d.description,
        runningConfig: {
          projectType: data.projectType || d.runningConfig.projectType,
          runningScript: defaultCmd,
        },
      }));

      // Advance to next step automatically
      setStep(2);
    } catch (e) {
      setDetectError(e.message || String(e));
    } finally {
      setDetecting(false);
    }
  }

  async function pickFolder() {
    const fp = await window.cursovable.selectFolder();
    if (fp) await detectAndPrefill(fp);
  }

  function submit() {
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    onCreate({
      id,
      name: draft.name.trim(),
      description: draft.description.trim(),
      path: draft.path.trim(),
      image: '',
      runningConfig: draft.runningConfig,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  
  return (
    <Modal
      title={step === 1 ? 'New Project • Select Folder' : 'New Project • Configure'}
      onClose={onClose}
      footer={(
        <>
          {step === 2 && (
            <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
          )}
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          {step === 2 ? (
            <Button disabled={!canCreate} style={{ minWidth: 140, opacity: canCreate ? 1 : 0.6 }} onClick={submit}>
              Create Project
            </Button>
          ) : null}
        </>
      )}
    >
      {step === 1 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Label>Folder Path</Label>
            <Input placeholder="/path/to/project" value={draft.path} readOnly />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button onClick={pickFolder} disabled={detecting}>
              {detecting ? 'Detecting…' : 'Browse…'}
            </Button>
          </div>
          {detectError && (
            <div style={{ color: '#ef4444', fontSize: 12 }}>{detectError}</div>
          )}
          {detected && (
            <div style={{ fontSize: 12, color: '#c9d5e1' }}>
              {detected.hasPackageJson ? 'package.json detected' : 'No package.json'} • {detected.hasIndexHtml ? 'index.html detected' : 'No index.html'}
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ gridColumn: '1 / span 2', display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Label>Folder Path</Label>
              <Input placeholder="/path/to/project" value={draft.path} readOnly />
            </div>
            <div style={{ alignSelf: 'end' }}>
              <Button onClick={pickFolder} style={{ minWidth: 120 }}>Change…</Button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Label>Name</Label>
            <Input placeholder="My Project" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Label>Description</Label>
            <Input placeholder="Optional description" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </div>

          {draft.runningConfig.projectType !== 'html' && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Label>Project Type</Label>
                <Select
                  value={draft.runningConfig.projectType}
                  onChange={(e) => setDraft({ ...draft, runningConfig: { ...draft.runningConfig, projectType: e.target.value } })}
                >
                  <option value="vite">Vite</option>
                  <option value="next">Next</option>
                  <option value="node">Node</option>
                  <option value="html">HTML</option>
                </Select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Label>Run Script</Label>
                <Select
                  value={draft.runningConfig.runningScript}
                  onChange={(e) => setDraft({ ...draft, runningConfig: { ...draft.runningConfig, runningScript: e.target.value } })}
                >
                  <option value="">Select script…</option>
                  {Object.keys(detected?.scripts || {}).map((key) => (
                    <option key={key} value={`npm run ${key}`}>{key} — {String(detected.scripts[key])}</option>
                  ))}
                </Select>
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}

export default function Dashboard({ onOpenProject }) {
  useDesignSystemStyles();
  const [projects, setProjects] = useState(loadProjects());
  const [showNew, setShowNew] = useState(false);

  function handleCreate(project) {
    addProject(project);
    setProjects(loadProjects());
    setShowNew(false);
  }

  function handleRemove(id) {
    if (!confirm('Remove this project? This only deletes it from the dashboard.')) return;
    removeProject(id);
    setProjects(loadProjects());
  }

  function ProjectCard({ p }) {
    const metaStyle = { fontSize: 11, opacity: 0.75, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' };

    return (
      <Card
        role="button"
        tabIndex={0}
        onClick={() => onOpenProject(p.id)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onOpenProject(p.id); }}
        style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10, cursor: 'pointer', position: 'relative', transition: 'transform .12s ease, box-shadow .2s ease' }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 28px rgba(0,0,0,0.35)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--ds-shadow)'; }}
      >
        <IconButton
          title="Remove project"
          aria-label="Remove project"
          onClick={(e) => { e.stopPropagation(); handleRemove(p.id); }}
          style={{ position: 'absolute', top: 8, right: 8 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 3h6m-9 3h12m-10 0v13a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6" stroke="#cde3ff" strokeWidth="1.6" strokeLinecap="round"/>
            <path d="M10 10v7M14 10v7" stroke="#cde3ff" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        </IconButton>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 40 }}>
          <div style={{ fontWeight: 700, color: '#e6eeff' }}>{p.name}</div>
          <Badge>{(p.runningConfig?.projectType || 'app').toUpperCase()}</Badge>
        </div>
        {p.description && (
          <div style={{ fontSize: 12, opacity: 0.85 }}>{p.description}</div>
        )}
        <div style={{ ...metaStyle, opacity: 0.7 }}>Path: {p.path}</div>
        {p.createdAt && (
          <div style={metaStyle}>Created: {new Date(p.createdAt).toLocaleDateString()}</div>
        )}
      </Card>
    );
  }

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Projects</h2>
        <Button onClick={() => setShowNew(true)} style={{ minWidth: 160, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 12h16M12 4v16" stroke="#f2f6ff" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          New Project
        </Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {projects.map((p) => (
          <ProjectCard key={p.id} p={p} />
        ))}
        {projects.length === 0 && (
          <div style={{ opacity: 0.7 }}>No projects yet. Click “New Project”.</div>
        )}
      </div>

      {showNew && (
        <NewProjectModal onClose={() => setShowNew(false)} onCreate={handleCreate} />
      )}
    </div>
  );
}


