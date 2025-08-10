const http = require('http');
const path = require('path');
const fs = require('fs');

function createSseManager() {
  const clients = new Set();
  return {
    handler(req, res) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });
      res.write('\n');
      clients.add(res);
      req.on('close', () => {
        try { clients.delete(res); } catch {}
      });
    },
    broadcast(event, data) {
      const payload = `event: ${event}\n` + (data ? `data: ${JSON.stringify(data)}\n` : '') + '\n';
      for (const client of clients) {
        try { client.write(payload); } catch {}
      }
    },
    close() {
      for (const client of clients) {
        try { client.end(); } catch {}
      }
      clients.clear();
    }
  };
}

function injectLiveReload(html) {
  if (!html || typeof html !== 'string') return html;
  if (html.includes('window.__cursovable_live_reload')) return html;
  const snippet = `\n<script>\n(function(){\n  if (window.__cursovable_live_reload) return;\n  window.__cursovable_live_reload = true;\n  try {\n    var es = new EventSource('/__cursovable_live_reload');\n    es.addEventListener('reload', function(){\n      try { if (window.__CURSOVABLE_RELOADING__) return; window.__CURSOVABLE_RELOADING__ = true; } catch(e){}\n      location.reload();\n    });\n  } catch (e) { console.warn('Live reload unavailable:', e); }\n})();\n</script>\n`;
  if (html.includes('</body>')) {
    return html.replace('</body>', snippet + '</body>');
  }
  return html + snippet;
}

function resolvePathSafe(root, reqPathname) {
  const urlPath = decodeURIComponent(reqPathname.split('?')[0]);
  const resolved = path.normalize(path.join(root, urlPath));
  if (!resolved.startsWith(path.normalize(root))) {
    return null; // directory traversal attempt
  }
  return resolved;
}

function startHtmlServer(rootDir, onLog) {
  const livereload = createSseManager();

  const server = http.createServer(async (req, res) => {
    try {
      if (req.url === '/__cursovable_live_reload') {
        return livereload.handler(req, res);
      }

      const noCache = {
        'Cache-Control': 'no-store, must-revalidate, no-cache, max-age=0',
        Pragma: 'no-cache',
        Expires: '0'
      };

      const safePath = resolvePathSafe(rootDir, req.url || '/');
      if (!safePath) {
        res.writeHead(403);
        return res.end('Forbidden');
      }

      let filePath = safePath;
      let stat = null;
      try { stat = fs.statSync(filePath); } catch {}

      if (stat && stat.isDirectory()) {
        const candidates = ['index.html', 'index.htm'];
        let found = null;
        for (const c of candidates) {
          const candidatePath = path.join(filePath, c);
          if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()) { found = candidatePath; break; }
        }
        if (found) {
          filePath = found;
        } else {
          // simple directory listing
          const files = fs.readdirSync(filePath, { withFileTypes: true });
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', ...noCache });
          const rel = path.relative(rootDir, filePath);
          const items = files.map((d) => `<li><a href="${path.posix.join('/', rel.split(path.sep).join('/'), d.name)}${d.isDirectory() ? '/' : ''}">${d.name}${d.isDirectory() ? '/' : ''}</a></li>`).join('\n');
          const html = `<!doctype html><meta charset="utf-8"><title>Index of /${rel}</title><h1>Index of /${rel}</h1><ul>${items}</ul>`;
          return res.end(injectLiveReload(html));
        }
      }

      // serve file
      const ext = path.extname(filePath).toLowerCase();
      const mime = (
        ext === '.html' || ext === '.htm' ? 'text/html; charset=utf-8' :
        ext === '.js' ? 'application/javascript; charset=utf-8' :
        ext === '.css' ? 'text/css; charset=utf-8' :
        ext === '.json' ? 'application/json; charset=utf-8' :
        ext === '.svg' ? 'image/svg+xml' :
        ext === '.png' ? 'image/png' :
        ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
        ext === '.gif' ? 'image/gif' :
        ext === '.ico' ? 'image/x-icon' : 'application/octet-stream'
      );

      if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        res.writeHead(404);
        return res.end('Not Found');
      }

      let stream;
      if (ext === '.html' || ext === '.htm') {
        const raw = fs.readFileSync(filePath, 'utf8');
        const withReload = injectLiveReload(raw);
        res.writeHead(200, { 'Content-Type': mime, ...noCache });
        return res.end(withReload);
      } else {
        res.writeHead(200, { 'Content-Type': mime, ...noCache });
        stream = fs.createReadStream(filePath);
        stream.pipe(res);
      }
    } catch (err) {
      try { if (onLog) onLog('error', String(err.stack || err)); } catch {}
      res.writeHead(500);
      res.end('Internal Server Error');
    }
  });

  // Listen on random available port
  const urlPromise = new Promise((resolve, reject) => {
    server.on('error', (err) => reject(err));
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      const url = `http://localhost:${port}/`;
      try { if (onLog) onLog('info', `HTML server listening at ${url}`); } catch {}
      resolve(url);
    });
  });

  // Watch for changes to trigger reload
  let watcher = null;
  try {
    watcher = fs.watch(rootDir, { recursive: true }, (eventType, filename) => {
      try {
        if (!filename) return;
        // lightweight filter
        const ext = path.extname(filename).toLowerCase();
        if (!ext || ['.html', '.htm', '.js', '.css', '.json', '.svg', '.png', '.jpg', '.jpeg', '.gif', '.ico'].includes(ext)) {
          if (onLog) onLog('info', `reload due to: ${eventType} ${filename}`);
          livereload.broadcast('reload', { file: filename, ts: Date.now() });
        }
      } catch {}
    });
  } catch (err) {
    try { if (onLog) onLog('error', `Watcher error: ${err.message}`); } catch {}
  }

  function stop() {
    try { livereload.close(); } catch {}
    try { if (watcher) watcher.close(); } catch {}
    try { server.close(); } catch {}
  }

  return { server, urlPromise, stop };
}

module.exports = { startHtmlServer };


