import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';
export default defineConfig({
  testDir: __dirname,
  testMatch: 'dooh-inventory.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  timeout: 25_000,
  use: { baseURL: 'http://127.0.0.1:41741', browserName: 'chromium', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: { command: 'node_modules/.bin/vite --config tools/dooh-ui/d13n/vite.config.ts',
    cwd: resolve(__dirname, '../../..'),
    url: 'http://127.0.0.1:41741', reuseExistingServer: false, timeout: 60_000,
    env: { VITE_API_URL: 'http://127.0.0.1:41741/api', BROWSER: 'none' },
  },
});
