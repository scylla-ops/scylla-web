import { defineConfig } from '@playwright/test';

/**
 * The end-to-end smoke tests: the built app, served by `vite preview`, in Chromium, with no
 * backend. `pnpm test:e2e` runs them; the `static` job of the CI runs them after the build.
 * A machine with a Chromium of its own names it in `PLAYWRIGHT_CHROMIUM_EXECUTABLE`.
 */
export default defineConfig({
  testDir: 'test/e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE },
  },
  webServer: {
    command: 'pnpm exec vite preview --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
  },
});
