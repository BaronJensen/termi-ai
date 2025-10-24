// Simple localStorage-backed project store

const STORAGE_KEY = 'termi-ai-projects';

export function loadProjects() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveProjects(projects) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function addProject(project) {
  const projects = loadProjects();
  projects.push(project);
  saveProjects(projects);
}

export function updateProject(projectId, updates) {
  const projects = loadProjects();
  const idx = projects.findIndex((p) => p.id === projectId);
  if (idx >= 0) {
    projects[idx] = { ...projects[idx], ...updates };
    saveProjects(projects);
  }
}

export function removeProject(projectId) {
  const projects = loadProjects().filter((p) => p.id !== projectId);
  saveProjects(projects);
}

export function getProject(projectId) {
  return loadProjects().find((p) => p.id === projectId) || null;
}


