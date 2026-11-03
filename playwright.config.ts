import { defineConfig } from '@playwright/test';

/**
 * The end-to-end smoke tests: the built app, served by `vite preview`, in Chromium, with no
 * backend. `pnpm test:e2e` runs them; the `static` job of the CI runs them after the build.
 * A machine with a Chromium of its own names it in `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. Without a
 * build, `vite preview` refuses to start and names the missing `dist/`.
 */
export default defineConfig({
  testDir: 'test/e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // A smoke test that needs a retry is a finding, not noise: look at the trace.
  retries: 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE },
  },
  webServer: {
    // The same address on both sides: `localhost` can resolve to `::1` where the browser uses 127.0.0.1.
    command: 'pnpm exec vite preview --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
  },
});
