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
  retries: process.env.CI ? 2 : 1, // 1 retry locally for flaky socket timing
  workers: 2,
  reporter: [['html', { open: 'never' }], ['list']],
  // Global timeout is generous; individual tests set their own expect timeouts
  timeout: 300_000, // 5 minutes — full game tests can be slow with 4 simulated players

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Action timeout: how long to wait for clicks/fills
    actionTimeout: 10_000,
    // Navigation timeout
    navigationTimeout: 15_000,
  },

  projects: [
    {
      name: 'ci',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /visual-.*\.spec\.ts/,
    },
    {
      name: 'visual',
      use: { ...devices['Desktop Chrome'], headless: false },
      testMatch: /visual-.*\.spec\.ts/,
    },
  ],

  /* No webServer — expect `npm run dev` already running */
});
