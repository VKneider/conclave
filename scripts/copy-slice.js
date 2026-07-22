import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

const src = path.join(projectRoot, 'node_modules', 'slicejs-web-framework', 'Slice', 'Slice.js');
const dstDir = path.join(projectRoot, 'dist', 'Slice');
const dst = path.join(dstDir, 'Slice.js');

if (!fs.existsSync(src)) {
  console.error(`Slice.js not found at ${src}`);
  process.exit(1);
}

if (!fs.existsSync(dstDir)) {
  fs.mkdirSync(dstDir, { recursive: true });
}

// Copy and patch — the framework init() loads critical bundles before
// initializing slice.logger, but Controller.loadBundle() internally calls
// slice.logger.logWarning(). Insert a noop logger before bundle loading so
// the framework doesn't crash.
let content = fs.readFileSync(src, 'utf8');

// Insert noop logger before the "Initialize bundles before building components" block
const patchMarker = `// Initialize bundles before building components.`;
const noopLoggerSnippet = [
  `      // Logger must be available before bundle loading (Controller calls`,
  `      // slice.logger.logWarning() internally).`,
  `      if (!window.slice.logger) {`,
  `         const noop = () => {};`,
  `         window.slice.logger = {`,
  `            error: noop, warn: noop, info: noop, debug: noop,`,
  `            logError: noop, logWarning: noop, logInfo: noop,`,
  `         };`,
  `      }`,
  ``,
  `      ${patchMarker}`,
].join('\n');

if (content.includes(patchMarker)) {
  content = content.replace(patchMarker, noopLoggerSnippet);
  fs.writeFileSync(dst, content, 'utf8');
  console.log(`Patched Slice.js → ${dst}`);
} else {
  // Fallback: copy unmodified if the marker isn't found (different framework version)
  fs.copyFileSync(src, dst);
  console.log(`Copied Slice.js to ${dst} (no patch applied — marker not found)`);
}
