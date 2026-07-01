import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Vercel doesn't set NODE_ENV automatically, but the framework needs it
// to determine production mode (serves from dist/, registers /Slice/Slice.js)
if (process.env.VERCEL && !process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

const { createSliceServer } = await import('slicejs-web-framework/api/framework/server.js');

const server = createSliceServer();
const app = server.app;

// Replace the framework's /Slice/Slice.js route handler to serve from dist/
// instead of node_modules (which Vercel's function bundler doesn't include)
if (app._router && app._router.stack) {
  for (const layer of app._router.stack) {
    if (layer.route && layer.route.path === '/Slice/Slice.js' && layer.route.stack) {
      for (const routeLayer of layer.route.stack) {
        if (typeof routeLayer.handle === 'function') {
          routeLayer.handle = (req, res) => {
            const slicePath = path.join(__dirname, '..', 'dist', 'Slice', 'Slice.js');
            try {
              if (fs.existsSync(slicePath)) {
                res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
                return res.send(fs.readFileSync(slicePath, 'utf8'));
              }
            } catch (error) {
              console.error('Error reading Slice.js:', error);
              return res.status(500).send('Error loading framework');
            }
            return res.status(404).send('Slice.js not found');
          };
        }
      }
      break;
    }
  }
}

server.start();

export default app;
