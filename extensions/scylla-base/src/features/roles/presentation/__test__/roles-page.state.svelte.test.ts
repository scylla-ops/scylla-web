import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { waitFor } from '@testing-library/svelte';
import {
  Permission,
  PermissionScope,
  PrincipalKind,
  permissionsStore,
  RoleKind,
  type EffectiveScopeEntity,
} from '@platform/authz';
import { selectionStore } from '@scylla/ui/stores';
import { withQueryClient, withRegistry } from '@test/render.svelte.ts';
import { ScyllaResult } from '@shared/utils/scylla-result.ts';
import type { PermissionRepository } from '../../domain/repository/permission.repository.ts';
import type { RoleEntity } from '../../domain/entities/role.entity.ts';
import type { GrantEntity } from '../../domain/entities/grant.entity.ts';
import { createRolesPage, type RolesScope } from '../roles-page.state.svelte.ts';

const role = (overrides: Partial<RoleEntity> = {}): RoleEntity => ({
  id: 'role-1',
  name: 'viewer',
  description: 'read only',
  scope: PermissionScope.ORGANIZATION,
  origin: { kind: 'custom' },
  kind: RoleKind.MEMBER,
  access: { kind: 'restricted', permissions: [Permission.READ_ORGANIZATION] },
  ...overrides,
});

const builtin = role({
  id: 'role-2',
  name: 'admin',
  origin: { kind: 'builtin', key: 'organization-admin' },
});
const auditor = role({
  id: 'auditor',
  name: 'Auditor',
  origin: { kind: 'custom', ownerOrganizationId: 'org-1' },
});
const foreign = role({
  id: 'foreign',
  name: 'Globex role',
  origin: { kind: 'custom', ownerOrganizationId: 'org-2' },
});

const grant = (overrides: Partial<GrantEntity> = {}): GrantEntity => ({
  id: 'grant-1',
  principal: { kind: PrincipalKind.USER, id: 'user-1' },
  roleId: 'role-1',
  scope: PermissionScope.ORGANIZATION,
  scopeId: 'org-1',
  ...overrides,
});

const PLATFORM: RolesScope = { kind: 'platform' };
const ACME: RolesScope = { kind: 'organization', organizationId: 'org-1', organizationName: 'Acme' };

let listRoles: ReturnType<typeof vi.fn>;
let listGrants: Mock<(scope?: PermissionScope, scopeId?: string) => Promise<unknown>>;
let deleteRole: ReturnType<typeof vi.fn>;
let listMembers: ReturnType<typeof vi.fn>;
let getProjects: ReturnType<typeof vi.fn>;
let cache: ReturnType<typeof withQueryClient>;
let restoreRegistry: () => void;

const holding = (...scopes: EffectiveScopeEntity[]) =>
  permissionsStore.setState({ permissions: { scopes } });

const SYSTEM_ADMIN: EffectiveScopeEntity = {
  scope: PermissionScope.SYSTEM,
  scopeId: '',
  access: { kind: 'fullControl' },
};
const ACME_ADMIN: EffectiveScopeEntity = {
  scope: PermissionScope.ORGANIZATION,
  scopeId: 'org-1',
  access: { kind: 'fullControl' },
};

beforeEach(() => {
  listRoles = vi.fn().mockResolvedValue(ScyllaResult.success([role(), builtin, foreign]));
  listGrants = vi
    .fn<(scope?: PermissionScope, scopeId?: string) => Promise<unknown>>()
    .mockResolvedValue(ScyllaResult.success([grant()]));
  deleteRole = vi.fn().mockResolvedValue(ScyllaResult.success(undefined));
  listMembers = vi
    .fn()
    .mockResolvedValue(ScyllaResult.success([{ userId: 'user-1', username: 'ada' }]));
  getProjects = vi.fn().mockResolvedValue(
    ScyllaResult.success({ projects: [{ id: 'project-1', name: 'Web', organizationId: 'org-1' }] }),
  );

  cache = withQueryClient();
  restoreRegistry = withRegistry({
    roles: {
      permissionRepository: {
        listRoles,
        listGrants,
        deleteRole,
      } as unknown as PermissionRepository,
      updateRole: { execute: vi.fn() },
    },
    user: {
      userRepository: {
        getAll: vi
          .fn()
          .mockResolvedValue(
            ScyllaResult.success({ items: [{ userId: 'user-1', username: 'grace' }] }),
          ),
      },
    },
    organization: { organizationRepository: { listMembers } },
    project: { projectRepository: { getByOrganizationId: getProjects } },
  });

  selectionStore.setState({ selectedIds: {} });
  holding(SYSTEM_ADMIN);
});

afterEach(() => {
  cache.restore();
  restoreRegistry();
  permissionsStore.setState({ permissions: null });
});

const withPage = async (
  scope: RolesScope,
  body: (page: ReturnType<typeof createRolesPage>) => Promise<void> | void,
) => {
  let page!: ReturnType<typeof createRolesPage>;
  const cleanup = $effect.root(() => {
    page = createRolesPage(() => scope);
  });

  try {
    await body(page);
  } finally {
    cleanup();
  }
};

describe('createRolesPage — the platform', () => {
  it('lists the platform roles only, by name, never a role an organization owns', async () => {
    await withPage(PLATFORM, async page => {
      await waitFor(() => expect(page.roles).toHaveLength(2));
      expect(page.roles.map(entry => entry.name)).toEqual(['admin', 'viewer']);
      expect(listRoles).toHaveBeenCalledWith();
    });
  });

  it('counts holders from the grant list it already needs, with no extra request', async () => {
    listGrants.mockResolvedValue(
      ScyllaResult.success([
        grant(),
        grant({ id: 'grant-2', principal: { kind: PrincipalKind.USER, id: 'user-2' } }),
        grant({ id: 'grant-3', roleId: 'role-2' }),
      ]),
    );

    await withPage(PLATFORM, async page => {
      await waitFor(() => expect(page.memberCountOf('role-1')).toBe(2));
      expect(page.memberCountOf('role-2')).toBe(1);
      expect(page.memberCountOf('role-404')).toBe(0);
      expect(listGrants).toHaveBeenCalledTimes(1);
    });
  });

  it('never offers a builtin role for deletion — the backend compiles it in', async () => {
    await withPage(PLATFORM, async page => {
      await waitFor(() => expect(page.roles).toHaveLength(2));

      const custom = page.roles.find(entry => entry.id === 'role-1')!;
      expect(page.isSelectable(custom)).toBe(true);
      expect(page.isSelectable(builtin)).toBe(false);
      expect(page.isReadOnly(builtin)).toBe(false);
    });
  });

  it('offers nothing for deletion without MANAGE_ROLES, builtin or not', async () => {
    holding({
      scope: PermissionScope.SYSTEM,
      scopeId: '',
      access: { kind: 'restricted', permissions: [Permission.LIST_USERS] },
    });

    await withPage(PLATFORM, async page => {
      await waitFor(() => expect(page.roles).toHaveLength(2));

      expect(page.canManageRoles).toBe(false);
      expect(page.isSelectable(page.roles[0])).toBe(false);
    });
  });

  it('names a user from the directory, and an app by its id', async () => {
    await withPage(PLATFORM, async page => {
      await waitFor(() => expect(page.principalLabel(grant())).toBe('grace'));
      expect(
        page.principalLabel(grant({ principal: { kind: PrincipalKind.APP, id: 'app-7' } })),
      ).toBe('app-7');
    });
  });

  it('resolves the open role from the catalog, so an edit shows the fresh copy', async () => {
    await withPage(PLATFORM, async page => {
      await waitFor(() => expect(page.roles).toHaveLength(2));

      expect(page.activeRole).toBeNull();
      page.open('role-2');
      expect(page.activeRole?.name).toBe('admin');
    });
  });

  it('opens the form on nothing when creating, and on the role when editing', async () => {
    await withPage(PLATFORM, async page => {
      await waitFor(() => expect(page.roles).toHaveLength(2));

      page.openCreate();
      expect(page.formOpen).toBe(true);
      expect(page.editingRole).toBeNull();

      page.openEdit(page.roles[1]);
      expect(page.editingRole?.id).toBe('role-1');

      page.closeForm();
      expect(page.formOpen).toBe(false);
    });
  });

  it('deletes the selected roles through the repository', async () => {
    await withPage(PLATFORM, async page => {
      await waitFor(() => expect(page.roles).toHaveLength(2));

      page.selection.select('role-1');
      await page.selection.headerProps.onDeleteSelection?.();

      expect(deleteRole).toHaveBeenCalledWith('role-1');
    });
  });
});

describe('createRolesPage — an organization', () => {
  beforeEach(() => {
    listRoles.mockResolvedValue(ScyllaResult.success([builtin, auditor]));
    holding(ACME_ADMIN);
  });

  it("asks for the organization's catalog and puts its own roles apart from the platform's", async () => {
    await withPage(ACME, async page => {
      await waitFor(() => expect(page.roles).toHaveLength(2));

      expect(listRoles).toHaveBeenCalledWith('org-1');
      expect(page.groups.organization.map(entry => entry.id)).toEqual(['auditor']);
      expect(page.groups.platform.map(entry => entry.id)).toEqual(['role-2']);
    });
  });

  it('leaves out a SYSTEM-scope platform role: an organization cannot grant it', async () => {
    const systemAdmin = role({
      id: 'system-admin',
      name: 'System Admin',
      scope: PermissionScope.SYSTEM,
      origin: { kind: 'builtin', key: 'system-admin' },
    });
    listRoles.mockResolvedValue(ScyllaResult.success([builtin, auditor, systemAdmin]));

    await withPage(ACME, async page => {
      await waitFor(() => expect(page.roles).toHaveLength(2));

      expect(page.roles.map(entry => entry.id)).not.toContain('system-admin');
    });
  });

  it('edits and deletes its own roles only: a platform role is read only here', async () => {
    await withPage(ACME, async page => {
      await waitFor(() => expect(page.roles).toHaveLength(2));

      expect(page.isReadOnly(auditor)).toBe(false);
      expect(page.isSelectable(auditor)).toBe(true);
      expect(page.isReadOnly(builtin)).toBe(true);
      expect(page.isSelectable(builtin)).toBe(false);
    });
  });

  it('counts the grants of the organization and of its projects', async () => {
    listGrants.mockImplementation(scope =>
      Promise.resolve(
        ScyllaResult.success(
          scope === PermissionScope.PROJECT
            ? [
                grant({
                  id: 'grant-p',
                  principal: { kind: PrincipalKind.USER, id: 'user-2' },
                  roleId: 'auditor',
                  scope: PermissionScope.PROJECT,
                  scopeId: 'project-1',
                }),
                grant({
                  id: 'grant-p2',
                  roleId: 'auditor',
                  scope: PermissionScope.PROJECT,
                  scopeId: 'project-1',
                }),
              ]
            : [grant({ roleId: 'auditor' })],
        ),
      ),
    );

    await withPage(ACME, async page => {
      // user-1 holds it at the organization and on the project: one holder, not two.
      await waitFor(() => expect(page.memberCountOf('auditor')).toBe(2));
      expect(listGrants).toHaveBeenCalledWith(PermissionScope.ORGANIZATION, 'org-1');
      expect(listGrants).toHaveBeenCalledWith(PermissionScope.PROJECT, 'project-1');
      expect(listGrants).not.toHaveBeenCalledWith();
    });
  });

  it('shows no count when the grants are out of reach, rather than a false zero', async () => {
    holding({
      scope: PermissionScope.ORGANIZATION,
      scopeId: 'org-1',
      access: {
        kind: 'restricted',
        permissions: [Permission.MANAGE_ORG_ROLES, Permission.READ_ORGANIZATION],
      },
    });

    await withPage(ACME, async page => {
      await waitFor(() => expect(page.roles).toHaveLength(2));

      expect(page.memberCountOf('auditor')).toBeNull();
      expect(listGrants).not.toHaveBeenCalled();
    });
  });

  it('never asks for the members without LIST_ORGANIZATION_MEMBERS', async () => {
    holding({
      scope: PermissionScope.ORGANIZATION,
      scopeId: 'org-1',
      access: {
        kind: 'restricted',
        permissions: [Permission.MANAGE_ORG_ROLES, Permission.READ_ORGANIZATION],
      },
    });

    await withPage(ACME, async page => {
      await waitFor(() => expect(page.roles).toHaveLength(2));

      expect(listMembers).not.toHaveBeenCalled();
      expect(page.principalLabel(grant())).toBe('user-1');
    });
  });

  it('names a holder from the members of the organization, not the user directory', async () => {
    await withPage(ACME, async page => {
      await waitFor(() => expect(page.principalLabel(grant())).toBe('ada'));
      expect(listMembers).toHaveBeenCalledWith('org-1');
    });
  });

  it('asks the grant permission of the scope a grant is bound to before revoking it', async () => {
    holding({
      scope: PermissionScope.ORGANIZATION,
      scopeId: 'org-1',
      access: {
        kind: 'restricted',
        permissions: [Permission.MANAGE_ORG_ROLES, Permission.MANAGE_PROJECT_GRANTS],
      },
    });

    await withPage(ACME, page => {
      expect(page.canRevoke(grant())).toBe(false);
      expect(
        page.canRevoke(grant({ scope: PermissionScope.PROJECT, scopeId: 'project-1' })),
      ).toBe(true);
    });
  });
});
