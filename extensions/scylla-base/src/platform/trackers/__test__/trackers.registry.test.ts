// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { fixedNamePart } from '../domain/structs/tracker.struct.ts';
import { SCYLLA_TRACKERS } from '../presentation/ui/trackers.registry.ts';

/**
 * The registry and the code stay equal (rule "no cookie or storage key without a registry
 * entry", root `AGENTS.md`). Each file of the app that uses a cookie or the browser storage
 * writes a tracker that it owns, reads a tracker of another file, or is a mechanism that writes
 * the key of its caller. Each owner in this repository names the key that it writes.
 */

const WORKSPACE = join(dirname(fileURLToPath(import.meta.url)), '../../../../../..');
const REPOSITORY = 'scylla-web/';
const ROOTS = ['apps', 'packages', 'sdks', 'extensions'];

/** The files that write the key that their caller gives. */
const MECHANISMS = new Set(['packages/ui/src/stores/create-store.ts']);

/** The files that use a tracker of another file: the file, then the name of the tracker. */
const USERS: Record<string, string> = {
  'apps/web/index.html': 'scylla-theme',
  'extensions/scylla-base/src/shell/presentation/layout/user-preferences.ts': 'scylla-theme',
  'extensions/scylla-base/src/features/access/presentation/access.queries.ts': 'userId',
  'extensions/scylla-base/src/features/apps/presentation/ui/AgentDetails/AgentDetails.page.svelte':
    'userId',
  'extensions/scylla-base/src/features/apps/presentation/ui/NewAgent/new-agent.state.svelte.ts':
    'userId',
  'extensions/scylla-base/src/features/onboarding/presentation/ui/OnboardingTour/onboarding-tour.state.svelte.ts':
    'userId',
  'extensions/scylla-base/src/features/roles/presentation/roles.queries.ts': 'userId',
  'extensions/scylla-base/src/features/user/presentation/user.queries.ts': 'userId',
  'extensions/scylla-base/src/features/user/user.module.ts': 'userId',
  // It removes the keys of the account at the sign-out: `userId` and the keys of other files.
  'extensions/scylla-base/src/features/login/infrastructure/account-storage.ts': 'userId',
  'extensions/scylla-base/src/features/pipeline/presentation/ui/editor/blueprint/canvas/node-appearance-preference.state.svelte.ts':
    'scylla.blueprint.node-appearance',
};

const STORAGE = /\b(?:localStorage|sessionStorage|cookieStore)\b|\bdocument\.cookie\b/;
const SOURCE = /\.(?:ts|js|svelte|html)$/;
const NOT_SHIPPED =
  /(?:\.test\.ts|\.spec\.ts|\.d\.ts|\.fixture\.(?:ts|svelte))$|\/__test__\/|\/generated\//;

/** The code with no comment: a comment can name the storage that the code does not use. */
const withoutComments = (source: string) =>
  source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

const filesOf = (root: string): string[] =>
  readdirSync(join(WORKSPACE, root), { withFileTypes: true }).flatMap(entry => {
    const path = `${root}/${entry.name}`;
    if (entry.isDirectory()) {
      return ['node_modules', 'dist', 'generated'].includes(entry.name) ? [] : filesOf(path);
    }
    return SOURCE.test(path) && !NOT_SHIPPED.test(path) ? [path] : [];
  });

const storageUsers = ROOTS.filter(root => existsSync(join(WORKSPACE, root)))
  .flatMap(filesOf)
  .filter(path => STORAGE.test(withoutComments(readFileSync(join(WORKSPACE, path), 'utf8'))));

const owned = SCYLLA_TRACKERS.filter(tracker => tracker.owner.startsWith(REPOSITORY));
const owners = new Set(owned.map(tracker => tracker.owner.slice(REPOSITORY.length)));
const names = new Set(SCYLLA_TRACKERS.map(tracker => tracker.name));

describe('the tracker registry', () => {
  it('finds the files that use the browser storage, so this test is not vacuous', () => {
    expect(storageUsers.length).toBeGreaterThan(5);
  });

  it.each(storageUsers)('has an entry for each key that %s uses', path => {
    const known = owners.has(path) || MECHANISMS.has(path) || names.has(USERS[path] ?? '');
    expect(
      known,
      `${path} uses a cookie or the browser storage, and no entry of the registry ` +
        '(`platform/trackers/presentation/ui/trackers.registry.ts`) names it as its owner. Add ' +
        'the entry, or add the file to USERS of this test when it uses a key of another file.',
    ).toBe(true);
  });

  it.each(owned.map(tracker => [tracker.name, tracker.owner] as const))(
    'finds %s in its owner %s',
    (name, owner) => {
      const path = join(WORKSPACE, owner.slice(REPOSITORY.length));
      expect(existsSync(path), `${owner} does not exist`).toBe(true);
      expect(readFileSync(path, 'utf8')).toContain(fixedNamePart(name));
    },
  );

  it('names each tracker once for each type', () => {
    const keys = SCYLLA_TRACKERS.map(tracker => `${tracker.type}:${tracker.name}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
