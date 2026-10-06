import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Permission, PermissionScope, permissionsStore, RoleKind } from '@platform/authz';
import { withQueryClient, withRegistry } from '@test/render.svelte.ts';
import { ScyllaError, ScyllaResult } from '@shared/utils/scylla-result.ts';
import type { PermissionRepository } from '../../domain/repository/permission.repository.ts';
import type { RoleEntity } from '../../domain/entities/role.entity.ts';
import { createRoleForm } from '../role-form.state.svelte.ts';

const role = (overrides: Partial<RoleEntity> = {}): RoleEntity => ({
  id: 'role-1',
  name: 'viewer',
  description: 'read only',
  scope: PermissionScope.ORGANIZATION,
  origin: { kind: 'custom' },
  kind: RoleKind.MEMBER,
  access: { kind: 'restricted', permissions: [Permission.LIST_SECRETS] },
  ...overrides,
});

let createRoleCall: ReturnType<typeof vi.fn>;
let execute: ReturnType<typeof vi.fn>;
let cache: ReturnType<typeof withQueryClient>;
let restoreRegistry: () => void;

beforeEach(() => {
  createRoleCall = vi.fn().mockResolvedValue(ScyllaResult.success(role()));
  execute = vi.fn().mockResolvedValue(ScyllaResult.success(role()));

  cache = withQueryClient();
  restoreRegistry = withRegistry({
    roles: {
      permissionRepository: { createRole: createRoleCall } as unknown as PermissionRepository,
      updateRole: { execute },
    },
  });
});

afterEach(() => {
  cache.restore();
  restoreRegistry();
  permissionsStore.setState({ permissions: null });
});

const withForm = async (
  editing: RoleEntity | null,
  body: (form: ReturnType<typeof createRoleForm>) => Promise<void> | void,
  organizationId: string | null = null,
) => {
  let form!: ReturnType<typeof createRoleForm>;
  const cleanup = $effect.root(() => {
    form = createRoleForm(editing, organizationId);
  });

  try {
    await body(form);
  } finally {
    cleanup();
  }
};

const createdPermissions = (): Permission[] => {
  const access = createRoleCall.mock.calls[0]?.[0]?.access as {
    kind: string;
    permissions?: Permission[];
  };
  return access.permissions ?? [];
};

describe('createRoleForm — creating', () => {
  it('starts empty, at organization scope, on restricted access', async () => {
    await withForm(null, form => {
      expect(form.isEdit).toBe(false);
      expect(form.name).toBe('');
      expect(form.scope).toBe(PermissionScope.ORGANIZATION);
      expect(form.accessKind).toBe('restricted');
    });
  });

  it('refuses to submit without a name', async () => {
    await withForm(null, form => {
      form.accessKind = 'fullControl';
      expect(form.isValid).toBe(false);

      form.name = '  ';
      expect(form.isValid).toBe(false);

      form.name = 'viewer';
      expect(form.isValid).toBe(true);
    });
  });

  it('refuses a restricted role that confers nothing at project scope', async () => {
    await withForm(null, form => {
      form.name = 'viewer';
      form.changeScope(PermissionScope.PROJECT);

      // Nothing ticked, and PROJECT confers nothing by construction.
      expect(form.conferredCount).toBe(0);
      expect(form.isValid).toBe(false);
    });
  });

  it('accepts an empty organization role — belonging already means something', async () => {
    await withForm(null, form => {
      form.name = 'member';

      // READ_ORGANIZATION rides along at this scope, so the role is never empty.
      expect(form.conferredCount).toBeGreaterThan(0);
      expect(form.isValid).toBe(true);
    });
  });

  it('writes the implicit permissions the editor never shows', async () => {
    await withForm(null, async form => {
      form.name = 'member';
      form.permissions = [Permission.LIST_SECRETS];

      await form.submit();

      expect(createdPermissions()).toContain(Permission.LIST_SECRETS);
      expect(createdPermissions()).toContain(Permission.READ_ORGANIZATION);
    });
  });

  it('adds a rider only once its stand-in is ticked', async () => {
    await withForm(null, async form => {
      form.name = 'member';
      form.permissions = [Permission.LIST_PROJECTS_BY_ORGANIZATION];

      await form.submit();

      expect(createdPermissions()).toContain(Permission.READ_PROJECT);
    });
  });

  it('drops the permissions a new scope cannot confer', async () => {
    await withForm(null, form => {
      form.name = 'viewer';
      form.permissions = [Permission.LIST_SECRETS, Permission.LIST_USERS];

      form.changeScope(PermissionScope.PROJECT);

      // LIST_USERS is a system capability; it has no meaning on a project.
      expect(form.permissions).not.toContain(Permission.LIST_USERS);
    });
  });

  it('drops a permission the new scope now confers implicitly, so it is not counted twice', async () => {
    await withForm(null, form => {
      form.name = 'viewer';
      form.changeScope(PermissionScope.SYSTEM);
      form.permissions = [Permission.READ_ORGANIZATION];

      form.changeScope(PermissionScope.ORGANIZATION);

      expect(form.permissions).not.toContain(Permission.READ_ORGANIZATION);
    });
  });

  it('trims what it writes, so a stray space never becomes part of the name', async () => {
    await withForm(null, async form => {
      form.name = '  viewer  ';
      form.description = '  read only  ';

      await form.submit();

      expect(createRoleCall).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'viewer', description: 'read only' }),
      );
    });
  });

  it('writes fullControl as an arm, not as a permission list', async () => {
    await withForm(null, async form => {
      form.name = 'owner';
      form.accessKind = 'fullControl';

      await form.submit();

      expect(createRoleCall).toHaveBeenCalledWith(
        expect.objectContaining({ access: { kind: 'fullControl' } }),
      );
    });
  });

  it('answers false on failure, so the dialog keeps the typing on screen', async () => {
    createRoleCall.mockResolvedValue(ScyllaResult.error(new ScyllaError('nope')));

    await withForm(null, async form => {
      form.name = 'viewer';

      await expect(form.submit()).resolves.toBe(false);
    });
  });
});

describe('createRoleForm — editing', () => {
  it('seeds from the role at construction, with no effect watching it', async () => {
    await withForm(role(), form => {
      expect(form.isEdit).toBe(true);
      expect(form.name).toBe('viewer');
      expect(form.description).toBe('read only');
      expect(form.permissions).toEqual([Permission.LIST_SECRETS]);
    });
  });

  it('keeps an implicit permission out of the ticked boxes — it is re-added on save', async () => {
    await withForm(
      role({
        access: {
          kind: 'restricted',
          permissions: [Permission.READ_ORGANIZATION, Permission.LIST_SECRETS],
        },
      }),
      form => {
        expect(form.permissions).toEqual([Permission.LIST_SECRETS]);
      },
    );
  });

  it('carries permissions this build cannot show, rather than deleting them', async () => {
    const uncatalogued = Permission.WRITE_JOB_STATUS;

    await withForm(
      role({ access: { kind: 'restricted', permissions: [uncatalogued, Permission.LIST_SECRETS] } }),
      async form => {
        expect(form.preservedCount).toBe(1);
        expect(form.permissions).not.toContain(uncatalogued);

        await form.submit();

        const access = execute.mock.calls[0][0].access as { permissions: Permission[] };
        expect(access.permissions).toContain(uncatalogued);
      },
    );
  });

  it('routes the save through the use case, under the role it was opened for', async () => {
    await withForm(role(), async form => {
      form.name = 'renamed';

      await expect(form.submit()).resolves.toBe(true);

      expect(execute).toHaveBeenCalledWith(expect.objectContaining({ id: 'role-1', name: 'renamed' }));
    });
  });

  it('starts a fullControl role on the fullControl arm', async () => {
    await withForm(role({ access: { kind: 'fullControl' } }), form => {
      expect(form.accessKind).toBe('fullControl');
      expect(form.permissions).toEqual([]);
    });
  });

  it('treats an access arm this build cannot read as restricted and empty', async () => {
    await withForm(role({ access: { kind: 'unknown' } as never }), form => {
      expect(form.accessKind).toBe('restricted');
      expect(form.permissions).toEqual([]);
      expect(form.preservedCount).toBe(0);
    });
  });
});

describe('createRoleForm — the owner and who holds the role', () => {
  const holdingInAcme = (access: 'full' | Permission[]) =>
    permissionsStore.setState({
      permissions: {
        scopes: [
          {
            scope: PermissionScope.ORGANIZATION,
            scopeId: 'org-1',
            access:
              access === 'full'
                ? { kind: 'fullControl' }
                : { kind: 'restricted', permissions: access },
          },
        ],
      },
    });

  it('creates a role of the organization, held by people unless told otherwise', async () => {
    holdingInAcme('full');

    await withForm(
      null,
      async form => {
        form.name = 'Auditor';
        await form.submit();

        expect(createRoleCall).toHaveBeenCalledWith(
          expect.objectContaining({ organizationId: 'org-1', kind: RoleKind.MEMBER }),
        );
      },
      'org-1',
    );
  });

  it('creates a role for apps when Apps is picked', async () => {
    holdingInAcme('full');

    await withForm(
      null,
      async form => {
        form.name = 'Deploy bot';
        form.kind = RoleKind.AGENT;
        await form.submit();

        expect(createRoleCall).toHaveBeenCalledWith(
          expect.objectContaining({ kind: RoleKind.AGENT }),
        );
      },
      'org-1',
    );
  });

  it('sends no owner for a platform role', async () => {
    await withForm(null, async form => {
      form.name = 'Support';
      form.accessKind = 'fullControl';
      await form.submit();

      expect(createRoleCall.mock.calls[0][0]).not.toHaveProperty('organizationId');
    });
  });

  it('offers no System scope to a role of an organization', async () => {
    await withForm(
      null,
      form => {
        expect(form.scopes).toEqual([PermissionScope.ORGANIZATION, PermissionScope.PROJECT]);
      },
      'org-1',
    );
    await withForm(null, form => {
      expect(form.scopes).toContain(PermissionScope.SYSTEM);
    });
  });

  it('never changes who holds an edited role', async () => {
    await withForm(role({ kind: RoleKind.AGENT }), form => {
      form.kind = RoleKind.MEMBER;
      expect(form.kind).toBe(RoleKind.AGENT);
    });
  });

  it('locks what the author does not hold in the organization', async () => {
    holdingInAcme([Permission.RUN_PIPELINE, Permission.READ_ORGANIZATION]);

    await withForm(
      null,
      form => {
        form.changeScope(PermissionScope.PROJECT);

        expect(form.lockedPermissions.has(Permission.RUN_PIPELINE)).toBe(false);
        expect(form.lockedPermissions.has(Permission.DELETE_PIPELINE)).toBe(true);
        expect(form.canGiveFullControl).toBe(false);
      },
      'org-1',
    );
  });

  it("keeps a locked permission an edited role already holds, rather than stripping it", async () => {
    holdingInAcme([Permission.READ_ORGANIZATION]);

    await withForm(
      role({
        origin: { kind: 'custom', ownerOrganizationId: 'org-1' },
        access: { kind: 'restricted', permissions: [Permission.LIST_SECRETS] },
      }),
      form => {
        expect(form.lockedPermissions.has(Permission.LIST_SECRETS)).toBe(true);
        expect(form.permissions).toContain(Permission.LIST_SECRETS);
      },
      'org-1',
    );
  });
});
