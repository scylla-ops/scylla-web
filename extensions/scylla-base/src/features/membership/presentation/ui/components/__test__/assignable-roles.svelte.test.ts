import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { flushSync } from 'svelte';
import { Permission, PermissionScope, permissionsStore, RoleKind } from '@platform/authz';
import { withQueryClient, withRegistry } from '@test/render.svelte.ts';
import { ScyllaResult } from '@shared/utils/scylla-result.ts';
import type { RoleEntity } from '@base/features/roles';
import { createAssignableRoles } from '../assignable-roles.state.svelte.ts';

interface GrantableRole {
  roleId: string;
  name: string;
  scope: PermissionScope;
  kind: number;
  description: string;
  ownerOrganizationId?: string;
}

const role = (overrides: Partial<RoleEntity> = {}): RoleEntity =>
  ({
    id: 'role-1',
    name: 'Custom name',
    description: 'Custom description',
    scope: PermissionScope.PROJECT,
    origin: { kind: 'custom' },
    kind: RoleKind.MEMBER,
    access: { kind: 'fullControl' },
    ...overrides,
  });

const grantable = (overrides: Partial<GrantableRole> = {}): GrantableRole => ({
  roleId: 'project-viewer',
  name: '',
  scope: PermissionScope.PROJECT,
  kind: 0,
  description: 'Read-only access',
  ...overrides,
});

let listRoles: ReturnType<typeof vi.fn>;
let listGrantableRoles: ReturnType<typeof vi.fn>;
let cache: ReturnType<typeof withQueryClient>;
let restoreRegistry: () => void;

const grantCatalogAccess = () =>
  permissionsStore.setState({
    permissions: {
      scopes: [{ scope: PermissionScope.SYSTEM, scopeId: '', access: { kind: 'fullControl' } }],
    },
  });

const denyCatalogAccess = () => permissionsStore.setState({ permissions: { scopes: [] } });

const grantOnOrganization = (...permissions: Permission[]) =>
  permissionsStore.setState({
    permissions: {
      scopes: [
        {
          scope: PermissionScope.ORGANIZATION,
          scopeId: 'org-1',
          access: { kind: 'restricted', permissions },
        },
      ],
    },
  });

beforeEach(() => {
  listRoles = vi.fn().mockResolvedValue(ScyllaResult.success([]));
  listGrantableRoles = vi.fn().mockResolvedValue(ScyllaResult.success([]));

  cache = withQueryClient();
  restoreRegistry = withRegistry({
    roles: { permissionRepository: { listRoles, listGrantableRoles } },
  });

  denyCatalogAccess();
});

afterEach(() => {
  cache.restore();
  restoreRegistry();
  permissionsStore.setState({ permissions: null });
});

/** Runs `body` in a reactive root and waits for both queries. */
const withAssignableRoles = async (
  scope: PermissionScope,
  body: (state: ReturnType<typeof createAssignableRoles>) => void | Promise<void>,
) => {
  let state!: ReturnType<typeof createAssignableRoles>;
  const cleanup = $effect.root(() => {
    state = createAssignableRoles(scope, () => 'org-1');
  });

  try {
    await vi.waitFor(() => {
      flushSync();
      expect(state.isLoading).toBe(false);
    });
    await body(state);
  } finally {
    cleanup();
  }
};

describe('createAssignableRoles', () => {
  it('never asks for the catalog without MANAGE_ROLES — a denial is not worth requesting', async () => {
    await withAssignableRoles(PermissionScope.PROJECT, () => {
      expect(listRoles).not.toHaveBeenCalled();
      expect(listGrantableRoles).toHaveBeenCalled();
    });
  });

  it('asks for the catalog once the caller holds MANAGE_ROLES', async () => {
    grantCatalogAccess();

    await withAssignableRoles(PermissionScope.PROJECT, async () => {
      await vi.waitFor(() => expect(listRoles).toHaveBeenCalled());
    });
  });

  it('lists the builtin grantable roles with no catalog access, humanizing an unmatched id', async () => {
    listGrantableRoles.mockResolvedValue(
      ScyllaResult.success([grantable({ roleId: 'project-viewer' })]),
    );

    await withAssignableRoles(PermissionScope.PROJECT, state => {
      expect(state.assignableRoles).toEqual([
        {
          roleId: 'project-viewer',
          name: 'Project viewer',
          description: 'Read-only access',
          ownedByOrganization: false,
          role: undefined,
        },
      ]);
    });
  });

  it("prefers the catalog's own name and description when both lists have the role", async () => {
    grantCatalogAccess();
    const catalogRole = role({
      id: 'role-1',
      name: 'Catalog name',
      description: 'Catalog description',
    });
    listGrantableRoles.mockResolvedValue(
      ScyllaResult.success([grantable({ roleId: 'role-1', description: 'grantable-only' })]),
    );
    listRoles.mockResolvedValue(ScyllaResult.success([catalogRole]));

    await withAssignableRoles(PermissionScope.PROJECT, async state => {
      await vi.waitFor(() => {
        flushSync();
        expect(state.assignableRoles[0]).toEqual({
          roleId: 'role-1',
          name: 'Catalog name',
          description: 'Catalog description',
          ownedByOrganization: false,
          role: catalogRole,
        });
      });
    });
  });

  it('asks for the roles of the organization once the caller may read it', async () => {
    grantOnOrganization(Permission.READ_ORGANIZATION);

    await withAssignableRoles(PermissionScope.PROJECT, () => {
      expect(listGrantableRoles).toHaveBeenCalledWith(undefined, 'org-1');
    });
  });

  it('asks for the platform roles only when the organization is out of reach', async () => {
    await withAssignableRoles(PermissionScope.PROJECT, () => {
      expect(listGrantableRoles).toHaveBeenCalledWith(undefined, undefined);
    });
  });

  it('names a role of the organization by the name the grantable list carries', async () => {
    grantOnOrganization(Permission.READ_ORGANIZATION);
    listGrantableRoles.mockResolvedValue(
      ScyllaResult.success([
        grantable({ roleId: 'f3c1', name: 'Deployer', ownerOrganizationId: 'org-1' }),
      ]),
    );

    await withAssignableRoles(PermissionScope.PROJECT, async state => {
      await vi.waitFor(() => {
        flushSync();
        expect(state.assignableRoles.map(entry => entry.name)).toEqual(['Deployer']);
      });
    });
  });

  it('reads the catalog of the organization with MANAGE_ORG_ROLES, never the whole one', async () => {
    grantOnOrganization(Permission.READ_ORGANIZATION, Permission.MANAGE_ORG_ROLES);

    await withAssignableRoles(PermissionScope.PROJECT, async () => {
      await vi.waitFor(() => expect(listRoles).toHaveBeenCalledWith('org-1'));
      expect(listRoles).not.toHaveBeenCalledWith();
    });
  });

  it('never offers a role of another organization that the whole catalog carries', async () => {
    grantCatalogAccess();
    listRoles.mockResolvedValue(
      ScyllaResult.success([
        role({ id: 'other-org-role', origin: { kind: 'custom', ownerOrganizationId: 'org-2' } }),
      ]),
    );

    await withAssignableRoles(PermissionScope.PROJECT, async state => {
      await vi.waitFor(() => expect(listRoles).toHaveBeenCalled());
      flushSync();
      expect(state.assignableRoles).toEqual([]);
    });
  });

  it('excludes a custom role bound to a different scope', async () => {
    grantCatalogAccess();
    listRoles.mockResolvedValue(
      ScyllaResult.success([role({ id: 'org-role', scope: PermissionScope.ORGANIZATION })]),
    );

    await withAssignableRoles(PermissionScope.PROJECT, async state => {
      await vi.waitFor(() => expect(listRoles).toHaveBeenCalled());
      flushSync();
      expect(state.assignableRoles).toEqual([]);
    });
  });

  it('labelFor resolves a role through the assignable list first', async () => {
    grantCatalogAccess();
    listGrantableRoles.mockResolvedValue(ScyllaResult.success([grantable({ roleId: 'role-1' })]));
    listRoles.mockResolvedValue(ScyllaResult.success([role({ id: 'role-1', name: 'From catalog' })]));

    await withAssignableRoles(PermissionScope.PROJECT, async state => {
      await vi.waitFor(() => {
        flushSync();
        expect(state.labelFor('role-1')).toBe('From catalog');
      });
    });
  });

  it('labelFor still names a role bound to another scope — known, just not assignable here', async () => {
    grantCatalogAccess();
    listRoles.mockResolvedValue(
      ScyllaResult.success([
        role({ id: 'org-role', scope: PermissionScope.ORGANIZATION, name: 'Org-only role' }),
      ]),
    );

    await withAssignableRoles(PermissionScope.PROJECT, async state => {
      await vi.waitFor(() => {
        flushSync();
        expect(state.labelFor('org-role')).toBe('Org-only role');
      });
    });
  });

  it('names an organization role inherited on a project, without offering it there', async () => {
    grantOnOrganization(Permission.READ_ORGANIZATION);
    listGrantableRoles.mockResolvedValue(
      ScyllaResult.success([
        grantable({
          roleId: '01m48tpcv54rh6nc689fh7trnq',
          name: 'Auditor',
          scope: PermissionScope.ORGANIZATION,
          ownerOrganizationId: 'org-1',
        }),
      ]),
    );

    await withAssignableRoles(PermissionScope.PROJECT, async state => {
      await vi.waitFor(() => {
        flushSync();
        expect(state.labelFor('01m48tpcv54rh6nc689fh7trnq')).toBe('Auditor');
      });
      expect(state.assignableRoles).toEqual([]);
    });
  });

  it('labelFor falls back to a humanized id when the role is unknown everywhere', async () => {
    await withAssignableRoles(PermissionScope.PROJECT, state => {
      expect(state.labelFor('mystery-role')).toBe('Mystery role');
    });
  });
});
