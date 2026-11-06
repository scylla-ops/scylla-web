import { screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PermissionScope, permissionsStore } from '@platform/authz';
import { installTestNavigator } from '@test/navigator.ts';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
import type { RoleEntity } from '../../../domain/entities/role.entity.ts';
import type { CatalogArea } from '../../../domain/structs/catalog.struct.ts';
import RoleEditor from './RoleEditor.svelte';

const areas: CatalogArea[] = [
  {
    id: 'workspace',
    level: 'workspace',
    machine: false,
    permissions: [
      { id: 'workspace.view', action: 'view', dependsOn: [], implicit: true },
      { id: 'workspace.edit', action: 'edit', dependsOn: [], implicit: false },
    ],
  },
  {
    id: 'pipelines',
    level: 'project',
    machine: false,
    permissions: [{ id: 'pipelines.view', action: 'view', dependsOn: [], implicit: false }],
  },
];

const role = (overrides: Partial<RoleEntity>): RoleEntity => ({
  key: 'r-1',
  name: 'Release',
  description: '',
  level: 'workspace',
  holder: 'people',
  grantName: 'r-1',
  builtin: false,
  fullControl: false,
  permissions: ['workspace.view', 'workspace.edit', 'pipelines.view'],
  holderCount: 0,
  ...overrides,
});

const levels = () => ({
  instance: screen.getByRole('radio', { name: /^Instance/ }),
  workspace: screen.getByRole('radio', { name: /^Workspace/ }),
  project: screen.getByRole('radio', { name: /^Project/ }),
});

let update: ReturnType<typeof vi.fn>;
let catalog: ReturnType<typeof vi.fn>;
let cache: ReturnType<typeof withQueryClient>;
let restoreRegistry: () => void;
let navigator: ReturnType<typeof installTestNavigator>;

beforeEach(() => {
  update = vi.fn().mockResolvedValue(role({}));
  catalog = vi.fn().mockResolvedValue(areas);
  cache = withQueryClient();
  navigator = installTestNavigator();
  restoreRegistry = withRegistry({
    roles: { roleRepository: { update, catalog, list: vi.fn().mockResolvedValue([]) } },
    access: {
      accessRepository: {
        heldPermissions: vi.fn().mockResolvedValue(new Set(['workspace.edit', 'pipelines.view'])),
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
  navigator.restore();
  permissionsStore.setState({ permissions: null });
});

const open = async (entity: RoleEntity) => {
  render(RoleEditor, { role: entity, listUrl: '/instance/roles' });
  await waitFor(() => expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(0));
};

describe('RoleEditor', () => {
  it('sends the new level of a role with no holder, with the permissions of that level', async () => {
    await open(role({}));

    await userEvent.click(levels().project);
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(update).toHaveBeenCalledOnce());
    expect(update.mock.calls[0]?.[0]).toEqual({
      id: 'r-1',
      name: 'Release',
      description: '',
      permissions: ['pipelines.view'],
      level: 'project',
    });
  });

  it('sends no level when the level stays', async () => {
    await open(role({}));

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(update).toHaveBeenCalledOnce());
    expect(update.mock.calls[0]?.[0]).not.toHaveProperty('level');
  });

  it('locks the level of a role with a holder', async () => {
    await open(role({ holderCount: 2 }));

    const { instance, workspace, project } = levels();
    expect(instance).toBeDisabled();
    expect(workspace).toBeDisabled();
    expect(project).toBeDisabled();
  });

  it('keeps a saved role for apps out of the instance level', async () => {
    await open(role({ holder: 'apps' }));

    const { instance, project } = levels();
    expect(instance).toBeDisabled();
    expect(project).toBeEnabled();
  });
});
