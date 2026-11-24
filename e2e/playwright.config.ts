import { defineConfig } from '@playwright/test';

/**
 * The end-to-end tests: a real browser against a real CE server, its database and Mailpit.
 * See `e2e/README.md` for the server they need. Vitest never runs them: they end in `.e2e.ts`.
 */
export default defineConfig({
  testDir: '.',
  testMatch: '**/*.e2e.ts',
  // One server and one database: the specs make their own users, one after the other.
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: 'list',
  use: {
    baseURL: process.env.SCYLLA_E2E_URL ?? 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
  },
});
