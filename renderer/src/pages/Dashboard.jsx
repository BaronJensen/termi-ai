import React, { useEffect, useMemo, useState } from 'react';
import { loadProjects, addProject, removeProject } from '../store/projects';
import { loadSettings, saveSettings } from '../store/settings';
import useDesignSystemStyles from '../ui/useDesignSystemStyles';
import Button from '../ui/Button';
import IconButton from '../ui/IconButton';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Label from '../ui/Label';
import Badge from '../ui/Badge';
import Card from '../ui/Card';
import Modal from '../ui/Modal';

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

function SettingsModal({ initial, onClose, onSave }) {
  // Timeout minutes selector: 5, 10, 15, 30, infinite (0ms)
  const ms = typeof initial?.cursorAgentTimeoutMs === 'number' ? initial.cursorAgentTimeoutMs : 900000;
  const initialChoice = ms === 0 ? 'infinite' : (['5','10','15','30'].includes(String(Math.round(ms / 60000))) ? String(Math.round(ms / 60000)) : '15');
  const [timeoutChoice, setTimeoutChoice] = useState(initialChoice);

  const [editor, setEditor] = useState(initial?.defaultEditor || '');
  const [pkgMgr, setPkgMgr] = useState(initial?.packageManager || 'yarn');
  const [availableEditors, setAvailableEditors] = useState([]);

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
      <Button onClick={() => onSave({ cursorAgentTimeoutMs: parsedTimeout, defaultEditor: editor, packageManager: pkgMgr })}>
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
      </div>
    </Modal>
  );
}

function LoadProjectModal({ onClose, onLoad }) {
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
    onLoad({
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
  const [template, setTemplate] = useState('react-vite');
  const [idea, setIdea] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [navigateTo, setNavigateTo] = useState(null); // { id, initialMessage }
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState(loadSettings());

  function buildPromptForTemplate(tpl, ideaText) {
    const base = (s) => s.trim().replace(/\s+$/,'');
    const generic = `Creating project. Please scaffold a new project in the current folder. Follow these requirements.\n\nUser goal: ${ideaText || 'Create a starter app'}\n`;
    switch (tpl) {
      case 'react-vite':
        return base(`${generic}\nStack: React + Vite\nTasks:\n- Initialize a React + Vite project if missing\n- Minimal pages and components to demonstrate routing and state\n- Add npm scripts: dev, build, preview\n- Provide clear README steps`);
      case 'vue-vite':
        return base(`${generic}\nStack: Vue 3 + Vite\nTasks:\n- Initialize Vue + Vite project if missing\n- Minimal views and components\n- Add npm scripts: dev, build, preview\n- Provide clear README steps`);
      case 'next':
        return base(`${generic}\nStack: Next.js\nTasks:\n- Initialize Next.js app (app router) if missing\n- Minimal pages and an API route\n- Add npm scripts: dev, build, start\n- Provide clear README steps`);
      case 'html':
      default:
        return base(`${generic}\nStack: Static HTML/CSS/JS\nTasks:\n- Create an index.html entry and a simple folder structure\n- Include a basic script and style file\n- Provide instructions to run with the built-in HTML server`);
    }
  }

  function handleCreate(project) {
    addProject(project);
    setProjects(loadProjects());
    setShowNew(false);
    // Navigate to ProjectView and auto-send initial message based on template + idea
    const initialMessage = buildPromptForTemplate(project.runningConfig?.projectType === 'vite' ? (template === 'react-vite' ? 'react-vite' : template) : template, idea);
    setNavigateTo({ id: project.id, initialMessage });
  }

  function handleLoad(project) {
    addProject(project);
    setProjects(loadProjects());
    setShowNew(false);
    // Navigate to ProjectView without initial message (for existing projects)
    setNavigateTo({ id: project.id });
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
      <IconButton
        title="Settings"
        aria-label="Settings"
        onClick={() => setShowSettings(true)}
        style={{ position: 'fixed', top: 12, right: 12, zIndex: 60 }}
      >
        <span role="img" aria-hidden="true">⚙️</span>
      </IconButton>
      <div className="ds-hero">
        <div className="ds-hero-title">Build something <span className="accent">Cursovable</span></div>
        <div className="ds-hero-subtitle">Create apps and websites by chatting with AI</div>
        <div className="ds-hero-bar">
          <textarea
            className="ds-textarea hero-one-line"
            placeholder="Describe what to build…"
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            style={{ gridColumn: '1 / span 3' }}
          />
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', gridColumn: '1 / span 3', justifyContent: 'flex-end' }}>
            <Select className="compact" value={template} onChange={(e) => setTemplate(e.target.value)} style={{ width: 'auto' }}>
              <option value="react-vite">⚛︎ React (Vite)</option>
              <option value="vue-vite">⚙︎ Vue (Vite)</option>
              <option value="next">▨ Next</option>
              <option value="html">⌘ HTML</option>
            </Select>
            <Button className="compact" onClick={() => setShowCreateModal(true)} style={{ height: 32 }}>
              <span className="icon-inline">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 12h16M12 4v16" stroke="#f2f6ff" strokeWidth="1.8" strokeLinecap="round"/></svg>
                Create
              </span>
            </Button>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {/* Load Existing card */}
        <Card
          role="button"
          tabIndex={0}
          onClick={() => setShowNew(true)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setShowNew(true); }}
          style={{
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            cursor: 'pointer',
            minHeight: 140,
            background: 'linear-gradient(135deg, #111827 0%, #1f2937 100%)',
            border: '1px solid #334155'
          }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0 2px 8px rgba(205,227,255,.25))' }}>
            <rect x="3" y="4" width="18" height="12" rx="2" stroke="#cde3ff" strokeWidth="1.6" />
            <path d="M8 20h8M12 16v4" stroke="#cde3ff" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontWeight: 700, color: '#e6eeff' }}>Load existing project</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Import a folder with package.json or index.html</div>
          </div>
        </Card>

        {projects.map((p) => (
          <ProjectCard key={p.id} p={p} />
        ))}
      </div>

      {showNew && (
        <LoadProjectModal onClose={() => setShowNew(false)} onLoad={handleLoad} />
      )}
      {showCreateModal && (
        <CreateTemplateModal onClose={() => setShowCreateModal(false)} onCreate={handleCreate} initialTemplate={template} initialPrompt={idea} />
      )}
      {showSettings && (
        <SettingsModal 
          initial={settings}
          onClose={() => setShowSettings(false)} 
          onSave={(next) => { const merged = saveSettings(next); setSettings(merged); setShowSettings(false); }}
        />
      )}
      {navigateTo && (
        // Imperative navigation hook for App-level router: we expose an event by opening project
        (() => { onOpenProject(navigateTo.id, navigateTo.initialMessage); setNavigateTo(null); return null; })()
      )}
    </div>
  );
}


