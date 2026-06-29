import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for Brotherhood Games E2E tests.
 *
 * Assumes dev servers are already running (frontend on :3000, backend on :4000).
 * Run with: npx playwright test
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // sequential by default; individual tests opt-in
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  timeout: 30_000,

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* No webServer — expect `npm run dev` already running */
});
