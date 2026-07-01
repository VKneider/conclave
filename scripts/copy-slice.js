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

fs.copyFileSync(src, dst);
console.log(`Copied Slice.js to ${dst}`);
