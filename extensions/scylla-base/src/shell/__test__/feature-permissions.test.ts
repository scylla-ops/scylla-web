// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { modules } from '../modules.ts';

/**
 * Reads the source of each feature: gating a button is declared nowhere a type
 * can see. Coarse on purpose: it finds a feature with no gating at all, not a
 * wrong permission.
 */

const FEATURES_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'features');

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap(entry => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

/** A test's mention of a permission proves nothing. */
const sourcesIn = (dir: string): string[] =>
  existsSync(dir) ? walk(dir).filter(f => /\.(tsx?|svelte)$/.test(f) && !/\.(test|fixture)\./.test(f)) : [];

const read = (path: string): string => readFileSync(path, 'utf8');

/** Comments stripped: a comment that mentions `can(` is not a gate. */
const code = (path: string): string =>
  read(path)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

const featureDirs = modules.map(module => {
  const dir = join(FEATURES_DIR, module.id);
  return {
    id: module.id,
    dir,
    hooks: join(dir, 'presentation/hooks'),
    ui: join(dir, 'presentation/ui'),
  };
});

describe('feature permission conformance', () => {
  it('every registered module has a directory to scan', () => {
    const missing = featureDirs.filter(feature => !existsSync(feature.dir)).map(f => f.id);
    expect(
      missing,
      'a module id no longer matches its folder — these rules silently skip it',
    ).toEqual([]);
  });

  /** A ratchet: entries may leave, never join without a design reason. */
  const UNGATED_FEATURES: Readonly<Record<string, string>> = {
    login:
      'Signing in is what establishes identity; there is no permission to hold before holding one.',
    access:
      'It has no UI: its Grant and Revoke run from the membership pages, which gate them.',
  };

  describe('a feature that mutates gates something in its UI', () => {
    /** A write is a `useMutation(` call or a `mutationOptions(` declaration. */
    const writesIn = (feature: (typeof featureDirs)[number]) =>
      sourcesIn(feature.hooks).some(file => code(file).includes('useMutation(')) ||
      sourcesIn(join(feature.dir, 'presentation'))
        .filter(file => file.endsWith('.queries.ts') || file.endsWith('.mutations.ts'))
        .some(file => code(file).includes('mutationOptions('));

    const mutating = featureDirs.filter(writesIn);

    it('finds the mutating features it is supposed to check', () => {
      expect(mutating.length).toBeGreaterThan(3);
    });

    /** The components, and the ViewModels where their gate logic belongs. */
    const uiSources = (feature: (typeof featureDirs)[number]) => [
      ...sourcesIn(feature.ui),
      ...sourcesIn(join(feature.dir, 'presentation')).filter(file =>
        file.endsWith('.state.svelte.ts'),
      ),
    ];

    it.each(mutating.map(feature => [feature.id, feature] as const))('%s', (id, feature) => {
      const gates = uiSources(feature).some(file =>
        /Permission\.[A-Z_]+|PermissionButton|useCan|useAuthorization|\bcan\(/.test(code(file)),
      );

      if (id in UNGATED_FEATURES) {
        expect(
          gates,
          `feature "${id}" now gates part of its UI — drop it from UNGATED_FEATURES, the list only shrinks.`,
        ).toBe(false);
        return;
      }

      expect(
        gates,
        `feature "${id}" performs mutations but no component under its presentation/ui/ and no ` +
          'ViewModel ever mentions a Permission. Every write it offers is available to anyone who can reach ' +
          'the page. Gate the actions, or add the feature to UNGATED_FEATURES with the reason.',
      ).toBe(true);
    });
  });

  /**
   * A query another feature uses runs outside its owner's route guard, so it must
   * check its permission itself (like `jobsByPipelinesQueries`).
   */
  describe('a query hook consumed across a feature boundary checks for itself', () => {
    const isSharedRead = (name: string) => /^use[A-Z]/.test(name) || /Queries$/.test(name);

    const barrelExports = new Map(
      featureDirs.map(feature => {
        const barrel = join(feature.dir, 'index.ts');
        const names = existsSync(barrel)
          ? [...code(barrel).matchAll(/\b(?:use[A-Z]\w*|\w+Queries)\b/g)].map(match => match[0])
          : [];
        return [feature.id, new Set(names)];
      }),
    );

    const consumersOf = new Map<string, Set<string>>();
    for (const feature of featureDirs) {
      for (const file of sourcesIn(feature.dir)) {
        const imports = code(file).matchAll(
          /import\s*(?:type\s*)?\{([^}]*)\}\s*from\s*'@base\/features\/([a-z-]+)'/g,
        );
        for (const [, names, owner] of imports) {
          if (owner === feature.id) continue;
          for (const raw of names.split(',')) {
            const name = raw.trim().replace(/^type\s+/, '');
            if (!isSharedRead(name)) continue;
            const key = `${owner}.${name}`;
            consumersOf.set(key, (consumersOf.get(key) ?? new Set()).add(feature.id));
          }
        }
      }
    }

    interface SharedHook {
      readonly key: string;
      readonly consumers: readonly string[];
      readonly selfGated: boolean;
    }

    const sharedReadsIn = (
      featureId: string,
      file: string,
      exportPattern: RegExp,
      gatePattern: RegExp,
    ): SharedHook[] => {
      const source = code(file);
      const exported = barrelExports.get(featureId) ?? new Set<string>();

      return [...source.matchAll(exportPattern)]
        .map(match => match[1])
        .filter(name => exported.has(name))
        .flatMap(name => {
          const consumers = consumersOf.get(`${featureId}.${name}`);
          if (!consumers) return [];
          return [
            {
              key: `${featureId}.${name}`,
              consumers: [...consumers],
              selfGated: gatePattern.test(source),
            },
          ];
        });
    };

    const sharedHooks: SharedHook[] = featureDirs.flatMap(feature => [
      ...sourcesIn(feature.hooks).flatMap(file =>
        // `useQueryClient` is not a query: match the call.
        /\buseQuery\(|\buseQueries\(/.test(code(file))
          ? sharedReadsIn(
              feature.id,
              file,
              /export const (use[A-Z]\w*)/g,
              /useAuthorization|useCan/,
            )
          : [],
      ),
      // A `*.queries.ts` factory gates with a `can(...)` inside its options.
      ...sourcesIn(join(feature.dir, 'presentation'))
        .filter(file => file.endsWith('.queries.ts'))
        .flatMap(file =>
          sharedReadsIn(feature.id, file, /export const (\w+Queries)\b/g, /\bcan\(/),
        ),
    ]);

    /** A ratchet. `TRIAGE`: nobody decided yet what the consuming page should show instead. */
    const UNCHECKED_SHARED_HOOKS: Readonly<Record<string, string>> = {
      'login.loginQueries':
        '`signInMethods` is public: the sign-in page reads it with no session. The account page ' +
        'reads it to offer the providers to link.',
      'organization.ownerQueries':
        '`list` takes the gate of its caller: ListOwners needs to read the workspace, and the ' +
        'members page that shows it requires LIST_ORGANIZATION_MEMBERS.',
      'jobs.jobQueries':
        '`byOrganization`, the read that crosses the barrel, is workspace-scoped and filtered ' +
        'server-side (ListWorkspaceJobs gives only what the caller may read). The fan-out that ' +
        '*does* check lives in its own file precisely so its `can(` does not vouch for this one.',
      'pipeline.pipelineQueries':
        '`byOrganization` is the one read that crosses the barrel, and ListWorkspacePipelines is ' +
        'scoped server-side, so there is nothing to gate client-side.',
      'secret.secretQueries':
        "Consumed by pipeline's step dialog to offer secret names, on an editor route requiring " +
        'UPDATE_PIPELINE rather than LIST_SECRETS: the names only, never a value.',
      'organization.organizationQueries':
        '`mine` needs no permission: ListWorkspaces gives the workspaces of the caller. The ' +
        'invitation page reads it after AcceptInvitation, to open the new workspace.',
      'access.accessQueries':
        "`list` takes the caller's gate as `enabled`, which is the only place the answer is " +
        'known: a workspace needs LIST_ORGANIZATION_MEMBERS and a project LIST_PROJECT_MEMBERS ' +
        '(see scope-membership.state.svelte.ts and ProjectMembers.page.svelte).',
    };

    it('finds the shared hooks it is supposed to check', () => {
      expect(sharedHooks.length).toBeGreaterThan(1);
    });

    it.each(sharedHooks.map(hook => [hook.key, hook] as const))('%s', (key, hook) => {
      if (key in UNCHECKED_SHARED_HOOKS) {
        expect(
          hook.selfGated,
          `${key} now checks for itself — drop it from UNCHECKED_SHARED_HOOKS, the list only shrinks.`,
        ).toBe(false);
        return;
      }

      expect(
        hook.selfGated,
        `${key} is consumed by ${hook.consumers.join(', ')}, so it runs outside its own route ` +
          'guard: those pages were entered on their permission, not this one. Gate the query ' +
          'with `enabled: ready && can(...)` as useJobsByPipelines does, or list it in ' +
          'UNCHECKED_SHARED_HOOKS with the reason.',
      ).toBe(true);
    });

    it('the unchecked list names only hooks that still cross a boundary', () => {
      const live = new Set(sharedHooks.map(hook => hook.key));
      const stale = Object.keys(UNCHECKED_SHARED_HOOKS).filter(key => !live.has(key));

      expect(
        stale,
        'these UNCHECKED_SHARED_HOOKS entries are no longer shared — delete them',
      ).toEqual([]);
    });
  });
});
