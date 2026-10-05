import { defineScyllaConfig } from './tooling/vite.ts';

export default defineScyllaConfig({
  workspaceRoot: import.meta.dirname,
  app: 'apps/web',
  // A ratchet, not a target: these are the levels reached today, so the number can only go up.
  // Raise them when a batch of tests lands; never lower them to make a red run green.
  thresholds: { statements: 77, branches: 70, functions: 74, lines: 77 },
});
