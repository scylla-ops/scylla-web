import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { PermissionScope, permissionsStore } from '@platform/authz';
import type { RoleEntity } from '../../../../domain/entities/role.entity.ts';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
import DeleteRoleDialog from '../../RoleEditor/DeleteRoleDialog.svelte';
import SaveRoleDialog from '../../RoleEditor/SaveRoleDialog.svelte';
import RolesLoadError from '../RolesLoadError.svelte';
import WorkspaceRolesList from '../WorkspaceRolesList.svelte';

const role = (overrides: Partial<RoleEntity>): RoleEntity => ({
  key: 'workspace-member',
  name: 'Workspace member',
  description: '',
  level: 'workspace',
  holder: 'people',
  grantName: 'member',
  builtin: true,
  fullControl: false,
  permissions: ['project.view'],
  holderCount: 4,
  ...overrides,
});

const custom = role({
  key: 'r-1',
  name: 'Release manager',
  grantName: 'r-1',
  builtin: false,
  workspaceId: 'w-1',
  holderCount: 3,
});

let list: ReturnType<typeof vi.fn>;
let remove: ReturnType<typeof vi.fn>;
let cache: ReturnType<typeof withQueryClient>;
let restoreRegistry: () => void;

beforeEach(() => {
  list = vi.fn().mockResolvedValue([role({}), custom]);
  remove = vi.fn().mockResolvedValue(undefined);
  cache = withQueryClient();
  restoreRegistry = withRegistry({
    roles: {
      roleRepository: {
        list,
        remove,
        catalog: vi.fn().mockResolvedValue([]),
        holders: vi.fn().mockResolvedValue({
          total: 1,
          holders: [
            {
              actorId: 'a',
              actorKind: 'user',
              displayName: 'Lina',
              handle: 'lina',
              scopeKind: 'workspace',
              scopeId: 'w-1',
              scopeName: 'acme',
            },
          ],
        }),
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

describe('WorkspaceRolesList', () => {
  it('splits the roles of the workspace from the roles of the instance', async () => {
    render(WorkspaceRolesList, { workspaceId: 'w-1', workspaceName: 'acme' });

    expect(await screen.findByText('Roles of acme')).toBeInTheDocument();
    expect(screen.getByText('Release manager')).toBeInTheDocument();
    expect(screen.getByText('From the instance')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('says so when the workspace has no custom role', async () => {
    list.mockResolvedValue([role({})]);
    render(WorkspaceRolesList, { workspaceId: 'w-1', workspaceName: 'acme' });

    expect(await screen.findByText('No custom roles yet')).toBeInTheDocument();
  });

  it('sorts the rows by name on a click on Role: A to Z, Z to A, then the default order', async () => {
    list.mockResolvedValue([
      role({ key: 'workspace-viewer', name: 'Workspace viewer' }),
      role({ key: 'r-2', name: 'auditor', grantName: 'r-2', builtin: false }),
      role({ key: 'project-editor', name: 'Project editor', level: 'project' }),
    ]);
    render(WorkspaceRolesList, { workspaceId: 'w-1', workspaceName: 'acme' });
    const header = await screen.findByRole('columnheader', { name: 'Role' });
    const names = () =>
      screen
        .getAllByRole('button')
        .map(button => button.textContent?.trim())
        .filter(name => name !== 'Role');

    expect(header).toHaveAttribute('aria-sort', 'none');
    expect(names()).toEqual(['Workspace viewer', 'auditor', 'Project editor']);

    await userEvent.click(within(header).getByRole('button'));
    expect(header).toHaveAttribute('aria-sort', 'ascending');
    expect(names()).toEqual(['auditor', 'Project editor', 'Workspace viewer']);

    await userEvent.click(within(header).getByRole('button'));
    expect(header).toHaveAttribute('aria-sort', 'descending');
    expect(names()).toEqual(['Workspace viewer', 'Project editor', 'auditor']);

    await userEvent.click(within(header).getByRole('button'));
    expect(header).toHaveAttribute('aria-sort', 'none');
    expect(names()).toEqual(['Workspace viewer', 'auditor', 'Project editor']);
  });

  it('shows the type beside the name and the level under it', async () => {
    render(WorkspaceRolesList, { workspaceId: 'w-1', workspaceName: 'acme' });

    const custom = (await screen.findByRole('button', { name: 'Release manager' })).parentElement;
    expect(within(custom as HTMLElement).getByText('Custom')).toBeInTheDocument();
    const builtin = screen.getByRole('button', { name: 'Workspace member' }).parentElement;
    expect(within(builtin as HTMLElement).getByText('Built-in')).toBeInTheDocument();
    expect(screen.getAllByText('Workspace')).toHaveLength(2);
  });
});

describe('RolesLoadError', () => {
  it('tells what failed, and tries again', async () => {
    const onRetry = vi.fn();
    render(RolesLoadError, { error: new Error('boom'), onRetry });

    expect(screen.getByText('The roles did not load')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalled();
  });
});

describe('DeleteRoleDialog', () => {
  const props = {
    role: custom,
    workspaceId: 'w-1',
    open: true,
    onOpenChange: vi.fn(),
    onDeleted: vi.fn(),
  };

  it('needs a target while people hold the role', async () => {
    render(DeleteRoleDialog, props);

    expect(await screen.findByText('Lina')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Move holders and delete' })).toBeDisabled();
    expect(remove).not.toHaveBeenCalled();
  });

  it('deletes a role with no holder at once', async () => {
    const onDeleted = vi.fn();
    render(DeleteRoleDialog, { ...props, role: { ...custom, holderCount: 0 }, onDeleted });

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await vi.waitFor(() => expect(onDeleted).toHaveBeenCalled());
    expect(remove).toHaveBeenCalledWith('r-1', undefined);
  });
});

describe('SaveRoleDialog', () => {
  it('shows the change before the save', async () => {
    const onConfirm = vi.fn();
    render(SaveRoleDialog, {
      role: custom,
      next: new Set(['pipelines.run']),
      areas: [
        {
          id: 'pipelines',
          level: 'project',
          machine: false,
          permissions: [{ id: 'pipelines.run', action: 'run', dependsOn: [], implicit: false }],
        },
      ],
      open: true,
      pending: false,
      onOpenChange: vi.fn(),
      onConfirm,
    });

    expect(screen.getByText('Save Release manager?')).toBeInTheDocument();
    expect(screen.getByText('Run pipelines')).toBeInTheDocument();
    expect(screen.getByText('project.view')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Save for 3 holders' }));
    expect(onConfirm).toHaveBeenCalled();
  });
});
