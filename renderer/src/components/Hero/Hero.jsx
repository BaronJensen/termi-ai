import React from 'react';
import Button from '../../ui/Button';
import Select from '../../ui/Select';

function Hero({ idea, setIdea, template, setTemplate, onCreateClick }) {
  return (
    <div className="ds-hero">
      <div className="ds-hero-title">Build <span className="accent">Cursovable</span> projects with AI</div>
      <div className="ds-hero-subtitle">Create apps locally with AI</div>
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
          <Button className="compact" onClick={onCreateClick} style={{ height: 32 }}>
            <span className="icon-inline">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 12h16M12 4v16" stroke="#f2f6ff" strokeWidth="1.8" strokeLinecap="round"/></svg>
              Create
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default Hero;
