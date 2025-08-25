import React, { useState } from 'react';
import { loadProjects, addProject, removeProject } from '../store/projects';
import { loadSettings, saveSettings } from '../store/settings';
import useDesignSystemStyles from '../ui/useDesignSystemStyles';
import IconButton from '../ui/IconButton';
import Badge from '../ui/Badge';
import Card from '../ui/Card';
import { CreateTemplateModal, SettingsModal, LoadProjectModal } from '../components/Modals';
import { Hero } from '../components/Hero';

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
    
    // Store project information in localStorage for auto-start
    try {
      const projectPrompt = idea || 'Create a starter app';
      const projectTemplate = template;
      
      localStorage.setItem(`cursovable-new-project-${project.id}`, projectPrompt);
      localStorage.setItem(`cursovable-new-project-template-${project.id}`, projectTemplate);
      
      console.log(`🚀 Stored new project info for auto-start:`, {
        projectId: project.id,
        prompt: projectPrompt,
        template: projectTemplate
      });
    } catch (e) {
      console.warn('Failed to store new project info in localStorage:', e);
    }
    
    // Navigate to ProjectView - the session manager will auto-start the project
    setNavigateTo({ id: project.id });
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
        style={{ 
          padding: 14, 
          display: 'flex', 
          flexDirection: 'column', 
          gap: 10, 
          cursor: 'pointer', 
          position: 'relative', 
          transition: 'transform .12s ease, box-shadow .2s ease',
          overflow: 'hidden',
          minHeight: '140px'
        }}
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
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', paddingRight: 40, gap: 8 }}>
          <div style={{ 
            fontWeight: 700, 
            color: '#e6eeff', 
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            minWidth: 0
          }}>
            {p.name}
          </div>
          <Badge style={{ flexShrink: 0 }}>{(p.runningConfig?.projectType || 'app').toUpperCase()}</Badge>
        </div>
        {p.description && (
          <div style={{ 
            fontSize: 12, 
            opacity: 0.85,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            lineHeight: '1.4em',
            maxHeight: '2.8em'
          }}>
            {p.description}
          </div>
        )}
        <div style={{ 
          ...metaStyle, 
          opacity: 0.7,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          Path: {p.path}
        </div>
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
      <Hero 
        idea={idea}
        setIdea={setIdea}
        template={template}
        setTemplate={setTemplate}
        onCreateClick={() => setShowCreateModal(true)}
      />

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
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ fontWeight: 700, color: '#e6eeff', marginBottom: 4 }}>Load existing project</div>
            <div style={{ 
              fontSize: 12, 
              opacity: 0.8,
              lineHeight: '1.3em',
              maxWidth: '200px'
            }}>
              Import a folder with package.json or index.html
            </div>
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
        (() => { onOpenProject(navigateTo.id); setNavigateTo(null); return null; })()
      )}
    </div>
  );
}


