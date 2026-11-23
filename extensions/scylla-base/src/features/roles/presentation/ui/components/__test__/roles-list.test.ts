import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/svelte';
import { PermissionScope, permissionsStore } from '@platform/authz';
import type { RoleEntity } from '../../../../domain/entities/role.entity.ts';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
import RolesList from '../RolesList.svelte';

const owner: RoleEntity = {
  key: 'owner',
  name: 'Workspace owner',
  description: '',
  level: 'workspace',
  holder: 'people',
  grantName: 'owner',
  builtin: true,
  fullControl: true,
  permissions: [],
  holderCount: 0,
};

let cache: ReturnType<typeof withQueryClient>;
let restoreRegistry: () => void;

beforeEach(() => {
  cache = withQueryClient();
  restoreRegistry = withRegistry({
    roles: {
      roleRepository: {
        list: vi.fn().mockResolvedValue([owner]),
        catalog: vi.fn().mockResolvedValue([]),
        holders: vi.fn().mockResolvedValue({ total: 0, holders: [] }),
      },
    },
  });
  permissionsStore.setState({
    permissions: {
      scopes: [{ scope: PermissionScope.SYSTEM, scopeId: '', access: { kind: 'fullControl' } }],
    },
  });
});

afterEach(() => {
  cache.restore();
  restoreRegistry();
  permissionsStore.setState({ permissions: null });
});

describe('RolesList', () => {
  it('fits the table in the column of the administration: the header sets the widths, and Permissions takes the rest', async () => {
    render(RolesList);

    const role = await screen.findByRole('columnheader', { name: 'Role' });
    expect(role.closest('table')).toHaveClass('table-fixed', 'min-w-[640px]');
    expect(role).toHaveClass('w-[38%]');
    expect(screen.getByRole('columnheader', { name: 'Permissions' }).className).not.toMatch(
      /\bw-/,
    );
  });

  it('writes the description after the level in one paragraph, so that it wraps under the level', async () => {
    render(RolesList);

    const level = (await screen.findAllByText('Workspace')).find(one => one.closest('td'));
    expect(level?.parentElement).not.toHaveClass('flex');
    expect(level?.parentElement).toHaveTextContent(
      'Workspace · Full control of one workspace, also its deletion and its owners.',
    );
  });
});
