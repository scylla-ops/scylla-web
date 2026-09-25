import { defineConfig } from '@lingui/cli';

export default defineConfig({
  sourceLocale: 'en',
  locales: ['fr', 'en'],
  catalogs: [
    {
      path: '<rootDir>/extensions/scylla-base/src/features/login/locales/{locale}/messages',
      include: ['extensions/scylla-base/src/features/login/'],
    },
    {
      path: '<rootDir>/extensions/scylla-base/src/features/jobs/locales/{locale}/messages',
      include: ['extensions/scylla-base/src/features/jobs/'],
    },
    {
      path: '<rootDir>/extensions/scylla-base/src/features/user/locales/{locale}/messages',
      include: ['extensions/scylla-base/src/features/user/'],
    },
    {
      path: '<rootDir>/extensions/scylla-base/src/features/project/locales/{locale}/messages',
      include: ['extensions/scylla-base/src/features/project/'],
    },
    {
      path: '<rootDir>/extensions/scylla-base/src/features/pipeline/locales/{locale}/messages',
      include: ['extensions/scylla-base/src/features/pipeline/'],
    },
    {
      path: '<rootDir>/extensions/scylla-base/src/features/marketplace/locales/{locale}/messages',
      include: ['extensions/scylla-base/src/features/marketplace/'],
    },
    {
      path: '<rootDir>/extensions/scylla-base/src/features/organization/locales/{locale}/messages',
      include: ['extensions/scylla-base/src/features/organization/'],
    },
    {
      path: '<rootDir>/extensions/scylla-base/src/features/apps/locales/{locale}/messages',
      include: ['extensions/scylla-base/src/features/apps/'],
    },
    {
      path: '<rootDir>/extensions/scylla-base/src/features/agents/locales/{locale}/messages',
      include: ['extensions/scylla-base/src/features/agents/'],
    },
    {
      path: '<rootDir>/extensions/scylla-base/src/features/secret/locales/{locale}/messages',
      include: ['extensions/scylla-base/src/features/secret/'],
    },
    {
      path: '<rootDir>/extensions/scylla-base/src/features/triggers/locales/{locale}/messages',
      include: ['extensions/scylla-base/src/features/triggers/'],
    },
    {
      path: '<rootDir>/extensions/scylla-base/src/features/roles/locales/{locale}/messages',
      include: ['extensions/scylla-base/src/features/roles/'],
    },
    {
      path: '<rootDir>/extensions/scylla-base/src/features/dashboard/locales/{locale}/messages',
      include: ['extensions/scylla-base/src/features/dashboard/'],
    },
    {
      path: '<rootDir>/extensions/scylla-base/src/features/membership/locales/{locale}/messages',
      include: ['extensions/scylla-base/src/features/membership/'],
    },
    {
      path: '<rootDir>/extensions/scylla-base/src/shared/locales/{locale}/messages',
      include: ['extensions/scylla-base/src/shared/'],
    },
    {
      path: '<rootDir>/extensions/scylla-base/src/shell/locales/{locale}/messages',
      include: ['extensions/scylla-base/src/shell/'],
    },
    {
      path: '<rootDir>/packages/ui/src/locales/{locale}/messages',
      include: ['packages/ui/src/'],
    },
    {
      path: '<rootDir>/packages/core/src/locales/{locale}/messages',
      include: ['packages/core/src/'],
      // The core's tests declare routes and links of their own, never shown to a user.
      exclude: ['**/*.test.ts'],
    },
    {
      path: '<rootDir>/extensions/scylla-base/src/platform/authz/locales/{locale}/messages',
      include: ['extensions/scylla-base/src/platform/authz/'],
    },
  ],
  compileNamespace: 'default',
});
