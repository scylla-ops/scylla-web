// @vitest-environment node
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { messages } from '@base/features/roles/locales/fr/messages.ts';
import { withLocale } from '@test/i18n.ts';
import { t } from '@scylla/ui/i18n';
import { areaLabels } from '../roles.messages.ts';
import { permissionLabel } from '../../presenters/permission-table.presenter.ts';

withLocale('fr', messages);

/**
 * The areas of `ListPermissionCatalog`, in the order of the server
 * (`scylla-domain/src/tenancy/catalog.rs`). A new area of the server goes here, with its label.
 */
const SERVER_AREAS = [
  'users',
  'workspaces',
  'instance_roles',
  'instance_access',
  'instance_settings',
  'git_providers',
  'workspace',
  'members',
  'workspace_roles',
  'apps',
  'agents',
  'projects',
  'dashboards',
  'library',
  'integrations',
  'git_events',
  'project',
  'project_members',
  'pipelines',
  'triggers',
  'jobs',
  'job_logs',
  'secrets',
  'job_execution',
  'repository',
];

const FRENCH_CATALOG = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  'locales',
  'fr',
  'messages.po',
);

/** The French text of each English message of the catalog of the roles. */
const french = new Map(
  [...readFileSync(FRENCH_CATALOG, 'utf8').matchAll(/^msgid "(.*)"\r?\nmsgstr "(.*)"$/gm)].map(
    ([, id, text]) => [id, text],
  ),
);

describe('the label of each area of the catalog', () => {
  it.each(SERVER_AREAS)('gives %s a title and a hint in English', id => {
    const label = areaLabels[id];

    expect(label, `no label for the area ${id}`).toBeDefined();
    expect(label.title.message).toBeTruthy();
    expect(label.hint.message).toBeTruthy();
  });

  it.each(SERVER_AREAS)('gives %s a title and a hint in French', id => {
    const { title, hint } = areaLabels[id] ?? {};

    expect(french.get(title?.message ?? ''), `no French title for the area ${id}`).toBeTruthy();
    expect(french.get(hint?.message ?? ''), `no French hint for the area ${id}`).toBeTruthy();
  });

  it('has a label only for an area of the server', () => {
    expect(Object.keys(areaLabels).sort()).toEqual([...SERVER_AREAS].sort());
  });

  it('names the dashboards and the library in French', () => {
    const catalog = ['dashboards', 'library'].map(id => ({
      id,
      level: 'workspace' as const,
      machine: false,
      permissions: [{ id: `${id}.manage`, action: 'manage', dependsOn: [], implicit: false }],
    }));

    expect(permissionLabel('dashboards.manage', catalog)).toBe('Tableaux de bord · Gérer');
    expect(permissionLabel('library.manage', catalog)).toBe('Bibliothèque · Gérer');
    expect(t(areaLabels.library.hint)).toBe(
      "Fragments de pipeline réutilisables de l'espace de travail",
    );
  });
});
