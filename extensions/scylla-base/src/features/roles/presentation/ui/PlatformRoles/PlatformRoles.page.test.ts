import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import {
  Permission,
  PermissionScope,
  PrincipalKind,
  permissionsStore,
  RoleKind,
} from '@platform/authz';
import { selectionStore } from '@scylla/ui/stores';
import { contextStore } from '@platform/context';
import { installTestNavigator } from '@test/navigator.ts';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import type { RoleEntity } from '@base/features/roles/domain/entities/role.entity.ts';
import type { GrantEntity } from '@base/features/roles/domain/entities/grant.entity.ts';
import PlatformRolesPage from './PlatformRoles.page.svelte';

const custom = (overrides: Partial<RoleEntity> = {}): RoleEntity => ({
  id: 'role-1',
  name: 'viewer',
  description: 'read only',
  scope: PermissionScope.ORGANIZATION,
  origin: { kind: 'custom' },
  kind: RoleKind.MEMBER,
  access: { kind: 'restricted', permissions: [Permission.LIST_SECRETS] },
  ...overrides,
});

const builtin = custom({
  id: 'role-2',
  name: 'organization-admin',
  description: '',
  origin: { kind: 'builtin', key: 'organization-admin' },
  kind: RoleKind.MEMBER,
  access: { kind: 'fullControl' },
});

const grant = (overrides: Partial<GrantEntity> = {}): GrantEntity => ({
  id: 'grant-1',
  principal: { kind: PrincipalKind.USER, id: 'user-1' },
  roleId: 'role-1',
  scope: PermissionScope.ORGANIZATION,
  scopeId: 'org-1',
  ...overrides,
});

let listRoles: ReturnType<typeof vi.fn>;
let listGrants: ReturnType<typeof vi.fn>;
let createRole: ReturnType<typeof vi.fn>;
let deleteRole: ReturnType<typeof vi.fn>;
let revokeGrant: ReturnType<typeof vi.fn>;
let cache: ReturnType<typeof withQueryClient>;
let restoreRegistry: () => void;

const withPermissions = (permissions: Permission[] | 'all') =>
  permissionsStore.setState({
    permissions: {
      scopes: [
        {
          scope: PermissionScope.SYSTEM,
          scopeId: '',
          access:
            permissions === 'all' ? { kind: 'fullControl' } : { kind: 'restricted', permissions },
        },
      ],
    },
  });

beforeEach(() => {
  listRoles = vi.fn().mockResolvedValue([custom(), builtin]);
  listGrants = vi.fn().mockResolvedValue([grant()]);
  createRole = vi.fn().mockResolvedValue(custom());
  deleteRole = vi.fn().mockResolvedValue(undefined);
  revokeGrant = vi.fn().mockResolvedValue(undefined);

  cache = withQueryClient();
  restoreRegistry = withRegistry({
    roles: {
      permissionRepository: {
        listRoles,
        listGrants,
        createRole,
        deleteRole,
        revokeGrant,
        createGrant: vi.fn(),
        getMyPermissions: vi.fn().mockResolvedValue({ scopes: [] }),
      },
      updateRole: { execute: vi.fn().mockResolvedValue(custom()) },
    },
    user: {
      userRepository: {
        getAll: vi.fn().mockResolvedValue({ items: [{ userId: 'user-1', username: 'ada' }] }),
      },
    },
    organization: {
      organizationRepository: {
        getMine: vi.fn().mockResolvedValue([{ id: 'org-1', name: 'Acme' }]),
      },
    },
    project: {
      projectRepository: {
        getByOrganizationId: vi.fn().mockResolvedValue({ projects: [] }),
      },
    },
  });

  selectionStore.setState({ selectedIds: {} });
  withPermissions('all');
});

afterEach(() => {
  cache.restore();
  restoreRegistry();
  permissionsStore.setState({ permissions: null });
});

describe('PlatformRolesPage — the catalog', () => {
  it('lists the roles with their scope and how many people hold them', async () => {
    render(PlatformRolesPage);

    expect(await screen.findByText('viewer')).toBeInTheDocument();
    expect(screen.getByText('organization-admin')).toBeInTheDocument();
    expect(screen.getByText('1 member')).toBeInTheDocument();
  });

  it('stands in for a role with no description rather than leaving a gap', async () => {
    render(PlatformRolesPage);

    await screen.findByText('organization-admin');
    expect(screen.getByText('No description')).toBeInTheDocument();
  });

  it('explains an empty catalog instead of showing a bare column', async () => {
    listRoles.mockResolvedValue([]);
    render(PlatformRolesPage);

    expect(
      await screen.findByText('No roles yet. Create one to get started.'),
    ).toBeInTheDocument();
  });

  it('offers no detail until a role is opened', async () => {
    render(PlatformRolesPage);

    expect(
      await screen.findByText('Select a role to see its permissions and members.'),
    ).toBeInTheDocument();
  });

  it('never offers a builtin role for deletion — the backend compiles it in', async () => {
    render(PlatformRolesPage);

    await screen.findByText('viewer');
    expect(screen.getByRole('checkbox', { name: 'viewer' })).toBeEnabled();
    expect(screen.getByRole('checkbox', { name: 'organization-admin' })).toBeDisabled();
  });

  it('deletes the selected roles once the confirmation is accepted', async () => {
    render(PlatformRolesPage);
    await screen.findByText('viewer');

    await userEvent.click(screen.getByRole('checkbox', { name: 'viewer' }));
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Continue' }));

    await vi.waitFor(() => expect(deleteRole).toHaveBeenCalledWith('role-1'));
  });
});

describe('PlatformRolesPage — one role in detail', () => {
  const openViewer = async () => {
    render(PlatformRolesPage);
    await userEvent.click(await screen.findByRole('button', { name: /viewer/ }));
  };

  it('shows what a restricted role confers, labelled against its own scope', async () => {
    await openViewer();

    expect(await screen.findByText('Permissions')).toBeInTheDocument();
    expect(screen.getByText('View the secrets of every project')).toBeInTheDocument();
  });

  it('says so plainly for a role that confers everything', async () => {
    render(PlatformRolesPage);
    await userEvent.click(await screen.findByRole('button', { name: /organization-admin/ }));

    expect(await screen.findByText('Grants full control over its scope.')).toBeInTheDocument();
  });

  it('lists who holds the role, by username rather than by principal id', async () => {
    await openViewer();

    expect(await screen.findByText('ada')).toBeInTheDocument();
    expect(screen.queryByText('user-1')).not.toBeInTheDocument();
  });

  it('names the organization a grant is bound to', async () => {
    await openViewer();

    await screen.findByText('ada');
    expect(screen.getByText('Acme')).toBeInTheDocument();
  });

  it('explains an unheld role instead of showing an empty list', async () => {
    listGrants.mockResolvedValue([]);
    await openViewer();

    expect(await screen.findByText('No one holds this role yet.')).toBeInTheDocument();
  });

  it('revokes a grant from the detail panel', async () => {
    await openViewer();
    await screen.findByText('ada');

    await userEvent.click(screen.getByRole('button', { name: 'Remove' }));

    await vi.waitFor(() => expect(revokeGrant).toHaveBeenCalledWith('grant-1'));
  });

  it('refuses to edit a builtin role, which the backend would reject anyway', async () => {
    render(PlatformRolesPage);
    await userEvent.click(await screen.findByRole('button', { name: /organization-admin/ }));

    expect(await screen.findByRole('button', { name: /Edit/ })).toBeDisabled();
  });
});

describe('PlatformRolesPage — without the permission', () => {
  beforeEach(() => withPermissions([Permission.LIST_USERS]));

  it('offers no way to create a role', async () => {
    render(PlatformRolesPage);

    await screen.findByText('viewer');
    expect(screen.queryByRole('button', { name: 'Create role' })).not.toBeInTheDocument();
  });

  it('selects nothing, so the bulk delete can never be reached', async () => {
    render(PlatformRolesPage);

    await screen.findByText('viewer');
    expect(screen.getByRole('checkbox', { name: 'viewer' })).toBeDisabled();
  });

  it('shows the edit and revoke controls disabled rather than hiding them', async () => {
    render(PlatformRolesPage);
    await userEvent.click(await screen.findByRole('button', { name: /viewer/ }));

    expect(await screen.findByRole('button', { name: /Edit/ })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await screen.findByText('ada');
    expect(screen.getByRole('button', { name: "You don't have permission to revoke grants." })).toBeDisabled();
  });
});

describe('PlatformRolesPage — the role editor is a page of its own', () => {
  let navigator: ReturnType<typeof installTestNavigator>;

  beforeEach(() => {
    navigator = installTestNavigator({ pathname: '/acme/platform-roles' });
    contextStore.getState().setOrganization('org-1', 'Acme');
  });

  afterEach(() => {
    navigator.restore();
    contextStore.getState().setOrganization(null, null);
  });

  it('opens the creation page from the header button, with no dialog', async () => {
    render(PlatformRolesPage);
    await screen.findByText('viewer');

    await userEvent.click(screen.getByRole('button', { name: 'Create role' }));

    expect(navigator.navigate).toHaveBeenCalledWith('/acme/platform-roles/new', undefined);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens the edit page of the selected role', async () => {
    render(PlatformRolesPage);
    await userEvent.click(await screen.findByRole('button', { name: /viewer/ }));
    await userEvent.click(await screen.findByRole('button', { name: /Edit/ }));

    expect(navigator.navigate).toHaveBeenCalledWith('/acme/platform-roles/role-1/edit', undefined);
  });

  it('opens on the role that the URL names, so a saved edit lands back on it', async () => {
    navigator.restore();
    navigator = installTestNavigator({ pathname: '/acme/platform-roles', search: '?role=role-1' });
    render(PlatformRolesPage);

    expect(await screen.findByRole('heading', { name: 'viewer' })).toBeInTheDocument();
  });
});

describe('PlatformRolesPage — when the backend refuses', () => {
  it("surfaces the backend's own message rather than an empty catalog", async () => {
    const error = new ScyllaError('nope', { code: 'PERMISSION_DENIED' });
    listRoles.mockRejectedValue(error);
    render(PlatformRolesPage);

    expect(
      await screen.findByText('No roles yet. Create one to get started.'),
    ).toBeInTheDocument();
  });
});
