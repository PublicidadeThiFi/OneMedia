import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:41731',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'node ../backend/ooh-manager-api/scripts/assistant-browser-e2e-server.mjs',
      url: 'http://127.0.0.1:43331/health/runtime',
      reuseExistingServer: false,
      env: { ASSISTANT_GEOCODING_PROVIDER: 'mock' },
      timeout: 120_000,
    },
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 41731 --strictPort',
      url: 'http://127.0.0.1:41731',
      reuseExistingServer: false,
      env: {
        VITE_API_URL: 'http://127.0.0.1:43331',
        VITE_ASSISTANT_PERSISTENT_CLIENT_IMPORTS: 'true',
        VITE_ASSISTANT_PERSISTENT_INVENTORY_IMPORTS: 'true',
        VITE_ASSISTANT_RECURRING_BLOCKS: 'true',
      },
      timeout: 120_000,
    },
  ],
});
