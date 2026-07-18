import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Browsers are installed to the machine-level cache via `pnpm exec playwright install chromium`.
// Keep the default cache location instead of forcing project-local storage.

const sliceConfig = JSON.parse(
   readFileSync(resolve(__dirname, 'src/sliceConfig.json'), 'utf-8'),
);
const SLICE_PORT = sliceConfig?.server?.port ?? 3001;
const PORT = Number(process.env.SLICE_TEST_PORT) || (SLICE_PORT + 5);
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
   testDir: './',
   testMatch: '**/*.spec.js',
   testIgnore: ['**/node_modules/**', '**/playwright-report/**', '**/test-results/**'],

   fullyParallel: true,
   forbidOnly: !!process.env.CI,
   retries: process.env.CI ? 1 : 0,
   workers: process.env.CI ? 2 : undefined,
   timeout: 30_000,
   expect: { timeout: 5_000 },

   reporter: process.env.CI
      ? [['github'], ['html', { open: 'never' }]]
      : [['list'], ['html', { open: 'never' }]],

   use: {
      baseURL,
      trace: 'on-first-retry',
      screenshot: 'only-on-failure',
   },

   projects: [
      {
         name: 'components',
         grepInvert: /@visual/,
         use: { ...devices['Desktop Chrome'] },
      },
      {
         name: 'visual',
         grep: /@visual/,
         use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } },
      },
   ],

   webServer: {
      command: `node ./node_modules/slicejs-cli/client.js dev --port ${PORT}`,
      url: `${baseURL}/api/status`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
   },
});
