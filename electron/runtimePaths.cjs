const fs = require('fs');
const path = require('path');

function isPackagedApp() {
  try {
    const { app } = require('electron');
    return !!(app && app.isPackaged);
  } catch {
    return false;
  }
}

function getAppRoot() {
  // In packaged builds, prefer the unpacked directory so CLI bins stay executable
  return isPackagedApp()
    ? path.join(process.resourcesPath, 'app.asar.unpacked')
    : path.resolve(__dirname, '..');
}

function getBinDirs(opts = {}) {
  const dirs = [];
  try {
    if (opts.cwd) {
      const localBin = path.join(opts.cwd, 'node_modules', '.bin');
      if (fs.existsSync(localBin)) dirs.push(localBin);
    }
  } catch {}

  try {
    const appBin = path.join(getAppRoot(), 'node_modules', '.bin');
    if (fs.existsSync(appBin)) dirs.push(appBin);
  } catch {}

  return dirs;
}

function prependPaths(envPath, additions = []) {
  const sep = path.delimiter;
  const parts = (envPath || '').split(sep).filter(Boolean);
  for (const entry of additions) {
    if (entry && !parts.includes(entry)) {
      parts.unshift(entry);
    }
  }
  return parts.join(sep);
}

function resolveBundledBin(binName, opts = {}) {
  const binDirs = opts.binDirs || getBinDirs({ cwd: opts.cwd });
  const names = process.platform === 'win32'
    ? [`${binName}.cmd`, `${binName}.ps1`, binName]
    : [binName];

  for (const dir of binDirs) {
    for (const name of names) {
      const candidate = path.join(dir, name);
      try {
        fs.accessSync(candidate, fs.constants.X_OK);
        return candidate;
      } catch {}
    }
  }

  return null;
}

function getNodeBinary() {
  // Electron bundles its own Node binary; process.execPath points to it
  return process.execPath;
}

module.exports = {
  isPackagedApp,
  getAppRoot,
  getBinDirs,
  prependPaths,
  resolveBundledBin,
  getNodeBinary,
};
