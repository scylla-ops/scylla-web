import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import type { AccessSourceEntity } from '@base/features/access';
import type { CatalogArea } from '@base/features/roles';
import { render } from '@test/render.ts';
import EffectiveAccessTable from './EffectiveAccessTable.svelte';

const areas: CatalogArea[] = [
  {
    id: 'pipelines',
    level: 'project',
    machine: false,
    permissions: [
      { id: 'pipelines.view', action: 'view', dependsOn: [], implicit: false },
      { id: 'pipelines.run', action: 'run', dependsOn: [], implicit: false },
    ],
  },
  {
    id: 'members',
    level: 'workspace',
    machine: false,
    permissions: [{ id: 'members.view', action: 'view', dependsOn: [], implicit: false }],
  },
];

const fromWorkspace: AccessSourceEntity = {
  scopeKind: 'workspace',
  scopeId: 'w',
  scopeName: 'acme',
  roleKey: 'workspace-member',
  roleName: 'Workspace member',
};

const props = {
  areas,
  level: 'project' as const,
  scopeId: 'p',
  scopeName: 'api',
  sources: new Map([['pipelines.run', [fromWorkspace]]]),
  holder: 'people' as const,
  slug: 'acme',
};

describe('EffectiveAccessTable', () => {
  it('shows only the areas of the level', () => {
    render(EffectiveAccessTable, props);

    expect(screen.getByText('Pipelines')).toBeInTheDocument();
    expect(screen.queryByText('Members')).not.toBeInTheDocument();
  });

  it('marks what the member has, what it does not have, and what does not exist', () => {
    render(EffectiveAccessTable, props);

    expect(screen.getByRole('button', { name: 'Run pipelines in api' })).toBeInTheDocument();
    expect(screen.getAllByTitle('This member does not have it')).toHaveLength(1);
  });

  it('names the role that gives a permission, and links to it', async () => {
    render(EffectiveAccessTable, props);

    await userEvent.click(screen.getByRole('button', { name: 'Run pipelines in api' }));

    expect(screen.getByText('Workspace member')).toBeInTheDocument();
    expect(screen.getByText('acme')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open Workspace member' })).toBeInTheDocument();
  });
});
