import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runMode = process.env.VERCEL
  ? 'production'
  : (process.env.NODE_ENV === 'production' ? 'production' : 'development');
const folderDeployed = runMode === 'production' ? 'dist' : 'src';

let sliceConfig = {};
try {
  const cfg = path.join(__dirname, '..', 'src', 'sliceConfig.json');
  if (fs.existsSync(cfg)) sliceConfig = JSON.parse(fs.readFileSync(cfg, 'utf8'));
} catch {}

const PORT = process.env.PORT || sliceConfig.server?.port || 3001;
const app = express();

// ==============================================
// SECURITY MIDDLEWARE (FIRST)
// ==============================================

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use((req, res, next) => {
  const p = req.path;
  const blocked = ['/node_modules', '/package.json', '/.env', '/.git'];
  if (blocked.some(b => p.startsWith(b))) {
    return res.status(403).json({ error: 'Forbidden', path: p });
  }
  if (p.includes('..') || p.includes('~')) {
    return res.status(403).json({ error: 'Forbidden', path: p });
  }
  next();
});

// ==============================================
// APPLICATION MIDDLEWARE
// ==============================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  if (req.path.endsWith('.js') || req.path.endsWith('.mjs') || req.path.endsWith('.cjs')) {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  }
  next();
});

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ==============================================
// RUNTIME ENV
// ==============================================

app.get('/slice-env.json', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ mode: runMode, env: {} });
});

// ==============================================
// PRODUCTION ROUTES
// ==============================================

if (runMode === 'production') {
  app.get('/Slice/Slice.js', (req, res) =>
    sendFile(res, path.join(__dirname, '..', 'dist', 'Slice', 'Slice.js'), 'application/javascript; charset=utf-8'));
  app.use('/Slice', (req, res) => res.status(404).send('Not found'));
  app.use('/Components', (req, res) => res.status(404).send('Not found'));
}

if (runMode === 'development') {
  app.use('/Slice/', express.static(path.join(__dirname, '..', 'node_modules', 'slicejs-web-framework', 'Slice')));
}

// ==============================================
// STATIC FILES
// ==============================================

if (runMode === 'development') {
  app.use(express.static(path.join(__dirname, '..', folderDeployed)));
} else {
  app.use('/App', express.static(path.join(__dirname, '..', 'dist', 'App')));

  const serve = (route, file, type) =>
    app.get(route, (req, res) => sendFile(res, path.join(__dirname, '..', 'dist', file), type));

  serve('/routes.js', 'routes.js', 'application/javascript; charset=utf-8');
  serve('/sliceConfig.json', 'sliceConfig.json', 'application/json; charset=utf-8');
  serve('/manifest.json', 'manifest.json', 'application/manifest+json; charset=utf-8');
  serve('/service-worker.js', 'service-worker.js', 'application/javascript; charset=utf-8');
  serve('/robots.txt', 'robots.txt', 'text/plain');
  serve('/sitemap.xml', 'sitemap.xml', 'application/xml');

  for (const folder of (Array.isArray(sliceConfig.publicFolders) ? sliceConfig.publicFolders : [])) {
    const f = folder.trim();
    if (f) {
      const p = f.startsWith('/') ? f : '/' + f;
      app.use(p, express.static(path.join(__dirname, '..', 'dist', p)));
    }
  }

  app.use('/bundles/', express.static(path.join(__dirname, '..', 'dist', 'bundles')));
}

// ==============================================
// API STATUS & 404
// ==============================================

app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', mode: runMode, timestamp: new Date().toISOString() });
});

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API route not found', path: req.originalUrl });
});

// ==============================================
// SPA FALLBACK
// ==============================================

app.use((req, res) => {
  // Express 5's res.sendFile rejects an absolute path arg with "Not Found";
  // pass the filename relative to a `root` dir instead (the supported form).
  const rootDir = path.join(__dirname, '..', folderDeployed, 'App');
  res.sendFile('index.html', { root: rootDir }, err => {
    if (err) res.status(500).send('<h1>500 - Internal Server Error</h1>');
  });
});

// ==============================================
// ERROR HANDLER
// ==============================================

app.use((err, req, res, next) => {
  console.error('[Server Error]', err.stack || err.message || err);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: runMode === 'production' ? 'An unexpected error occurred' : err.message
  });
});

// ==============================================
// HELPERS & START
// ==============================================

function sendFile(res, filePath, contentType) {
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', contentType);
    return res.send(fs.readFileSync(filePath, 'utf8'));
  }
  res.status(404).send('Not found');
}

if (!process.env.VERCEL) {
  app.listen(PORT, () => console.log(`Slice.js server running on port ${PORT}`));
}

export default app;
