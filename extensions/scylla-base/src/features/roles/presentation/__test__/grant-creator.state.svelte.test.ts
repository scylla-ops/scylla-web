import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { waitFor } from '@testing-library/svelte';
import {
  Permission,
  PermissionScope,
  PrincipalKind,
  permissionsStore,
  RoleKind,
} from '@platform/authz';
import { withQueryClient, withRegistry } from '@test/render.svelte.ts';
import { ScyllaResult } from '@shared/utils/scylla-result.ts';
import type { RoleEntity } from '../../domain/entities/role.entity.ts';
import type { GrantEntity } from '../../domain/entities/grant.entity.ts';
import { createGrantCreator } from '../grant-creator.state.svelte.ts';

const role = (overrides: Partial<RoleEntity> = {}): RoleEntity => ({
  id: 'role-1',
  name: 'viewer',
  description: '',
  scope: PermissionScope.ORGANIZATION,
  origin: { kind: 'custom' },
  kind: RoleKind.MEMBER,
  access: { kind: 'restricted', permissions: [Permission.LIST_SECRETS] },
  ...overrides,
});

const memberRole = role({
  id: 'role-member',
  name: 'organization-member',
  access: { kind: 'restricted', permissions: [Permission.READ_ORGANIZATION] },
});

const blindRole = role({
  id: 'role-blind',
  name: 'blind',
  access: { kind: 'restricted', permissions: [Permission.LIST_SECRETS] },
});

const grant = (overrides: Partial<GrantEntity> = {}): GrantEntity => ({
  id: 'grant-1',
  principal: { kind: PrincipalKind.USER, id: 'user-1' },
  roleId: 'role-member',
  scope: PermissionScope.ORGANIZATION,
  scopeId: 'org-1',
  ...overrides,
});

let listRoles: ReturnType<typeof vi.fn>;
let listGrants: ReturnType<typeof vi.fn>;
let createGrant: ReturnType<typeof vi.fn>;
let getAllUsers: ReturnType<typeof vi.fn>;
let getMine: ReturnType<typeof vi.fn>;
let getProjects: ReturnType<typeof vi.fn>;
let cache: ReturnType<typeof withQueryClient>;
let restoreRegistry: () => void;

beforeEach(() => {
  listRoles = vi.fn().mockResolvedValue(ScyllaResult.success([memberRole, blindRole]));
  listGrants = vi.fn().mockResolvedValue(ScyllaResult.success([grant()]));
  createGrant = vi.fn().mockResolvedValue(ScyllaResult.success(grant()));
  getAllUsers = vi.fn().mockResolvedValue(
    ScyllaResult.success({
      items: [
        { userId: 'user-1', username: 'ada' },
        { userId: 'user-2', username: 'grace' },
      ],
    }),
  );
  getMine = vi.fn().mockResolvedValue(
    ScyllaResult.success([
      { id: 'org-1', name: 'Acme' },
      { id: 'org-2', name: 'Globex' },
    ]),
  );
  getProjects = vi
    .fn()
    .mockResolvedValue(ScyllaResult.success({ projects: [{ id: 'project-1', name: 'Web' }] }));

  cache = withQueryClient();
  restoreRegistry = withRegistry({
    roles: {
      permissionRepository: {
        listRoles,
        listGrants,
        createGrant,
        // Every grant change reloads the caller's own permissions.
        getMyPermissions: vi.fn().mockResolvedValue(ScyllaResult.success({ scopes: [] })),
      },
      updateRole: { execute: vi.fn() },
    },
    user: { userRepository: { getAll: getAllUsers } },
    organization: { organizationRepository: { getMine } },
    project: { projectRepository: { getByOrganizationId: getProjects } },
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

const withCreator = async (
  forRole: RoleEntity,
  body: (creator: ReturnType<typeof createGrantCreator>) => Promise<void> | void,
) => {
  let creator!: ReturnType<typeof createGrantCreator>;
  const cleanup = $effect.root(() => {
    creator = createGrantCreator(() => forRole);
  });

  try {
    await body(creator);
  } finally {
    cleanup();
  }
};

describe('createGrantCreator — what the role scope asks for', () => {
  it('needs no target at system scope: the grant applies everywhere', async () => {
    await withCreator(role({ scope: PermissionScope.SYSTEM }), async creator => {
      await waitFor(() => expect(creator.users).toHaveLength(2));

      expect(creator.needsTargets).toBe(false);
      expect(creator.mayGrant).toBe(true);
      creator.userId = 'user-1';
      expect(creator.isValid).toBe(true);
    });
  });

  it('refuses to submit an organization grant with no organization picked', async () => {
    await withCreator(role(), async creator => {
      await waitFor(() => expect(creator.organizations).toHaveLength(2));

      creator.userId = 'user-1';
      expect(creator.isValid).toBe(false);

      creator.toggle({ id: 'org-1', name: 'Acme' });
      expect(creator.isValid).toBe(true);
    });
  });

  it('keeps picks across organizations — the selection is the list, not the page', async () => {
    await withCreator(role(), async creator => {
      await waitFor(() => expect(creator.organizations).toHaveLength(2));

      creator.toggle({ id: 'org-1', name: 'Acme' });
      creator.toggle({ id: 'org-2', name: 'Globex' });
      expect(creator.selectedCount).toBe(2);

      creator.toggle({ id: 'org-1', name: 'Acme' });
      expect(creator.selected).toEqual([{ id: 'org-2', name: 'Globex' }]);
    });
  });

  it('marks a target the user already holds, rather than offering it twice', async () => {
    // The grant has to be of *this* role: holding another one on org-1 is not
    // the same thing, and offering the target again is then correct.
    listGrants.mockResolvedValue(ScyllaResult.success([grant({ roleId: 'role-1' })]));

    await withCreator(role(), async creator => {
      await waitFor(() => expect(creator.organizations).toHaveLength(2));
      creator.userId = 'user-1';

      await waitFor(() => expect(creator.isAlreadyGranted('org-1')).toBe(true));
      expect(creator.isAlreadyGranted('org-2')).toBe(false);
    });
  });

  it('holds nothing as already granted until a user is picked', async () => {
    await withCreator(role(), async creator => {
      await waitFor(() => expect(creator.organizations).toHaveLength(2));

      expect(creator.isAlreadyGranted('org-1')).toBe(false);
    });
  });
});

describe('createGrantCreator — project scope and the tenant boundary', () => {
  const projectRole = role({ scope: PermissionScope.PROJECT });

  it('offers every user, carrying the reason the ineligible ones cannot receive it', async () => {
    await withCreator(projectRole, async creator => {
      await waitFor(() => expect(creator.users).toHaveLength(2));

      creator.browseOrganization('org-1');
      await waitFor(() => expect(creator.users[0].ineligible).toBeUndefined());

      // user-1 holds the member role on org-1; user-2 holds nothing there.
      expect(creator.users[1].ineligible).toBe('not-admitted');
      expect(creator.users).toHaveLength(2);
    });
  });

  it('separates "not admitted" from "admitted but cannot see the projects"', async () => {
    listGrants.mockResolvedValue(
      ScyllaResult.success([
        grant(),
        grant({
          id: 'grant-2',
          principal: { kind: PrincipalKind.USER, id: 'user-2' },
          roleId: 'role-blind',
        }),
      ]),
    );

    await withCreator(projectRole, async creator => {
      await waitFor(() => expect(creator.users).toHaveLength(2));
      creator.browseOrganization('org-1');

      await waitFor(() => expect(creator.users[1].ineligible).toBe('cannot-see-projects'));
    });
  });

  it('drops a chosen user who is not eligible in the organization just switched to', async () => {
    await withCreator(projectRole, async creator => {
      await waitFor(() => expect(creator.users).toHaveLength(2));

      creator.browseOrganization('org-1');
      await waitFor(() => expect(creator.users[1].ineligible).toBe('not-admitted'));
      creator.userId = 'user-1';

      // Nobody is admitted to org-2, so the pick cannot survive the switch.
      creator.browseOrganization('org-2');
      expect(creator.userId).toBe('');
    });
  });

  it('keeps a chosen user who is still eligible after the switch', async () => {
    listGrants.mockResolvedValue(
      ScyllaResult.success([grant(), grant({ id: 'grant-2', scopeId: 'org-2' })]),
    );

    await withCreator(projectRole, async creator => {
      await waitFor(() => expect(creator.users).toHaveLength(2));

      creator.browseOrganization('org-1');
      await waitFor(() => expect(creator.users[1].ineligible).toBe('not-admitted'));
      creator.userId = 'user-1';
      creator.browseOrganization('org-2');

      expect(creator.userId).toBe('user-1');
    });
  });

  it('reports that nobody can receive a grant here, so the dialog can say why', async () => {
    listGrants.mockResolvedValue(ScyllaResult.success([]));

    await withCreator(projectRole, async creator => {
      await waitFor(() => expect(creator.users).toHaveLength(2));
      creator.browseOrganization('org-1');

      await waitFor(() => expect(creator.hasSelectableUser).toBe(false));
    });
  });

  it("browses the chosen organization's projects, not the context's", async () => {
    await withCreator(projectRole, async creator => {
      await waitFor(() => expect(creator.users).toHaveLength(2));

      creator.browseOrganization('org-2');

      await waitFor(() => expect(creator.projects).toEqual([{ id: 'project-1', name: 'Web' }]));
      expect(getProjects).toHaveBeenCalledWith('org-2', expect.anything());
    });
  });
});

describe('createGrantCreator — submitting', () => {
  it('creates one grant per selected target and answers how many landed', async () => {
    await withCreator(role(), async creator => {
      await waitFor(() => expect(creator.organizations).toHaveLength(2));

      creator.userId = 'user-2';
      creator.toggle({ id: 'org-1', name: 'Acme' });
      creator.toggle({ id: 'org-2', name: 'Globex' });

      await expect(creator.submit()).resolves.toBe(2);
      expect(createGrant).toHaveBeenCalledTimes(2);
      expect(createGrant).toHaveBeenCalledWith({
        principal: { kind: PrincipalKind.USER, id: 'user-2' },
        roleId: 'role-1',
        scope: PermissionScope.ORGANIZATION,
        scopeId: 'org-1',
      });
    });
  });

  it('grants a system role with an empty scope id — there is nowhere to bind it', async () => {
    await withCreator(role({ scope: PermissionScope.SYSTEM }), async creator => {
      await waitFor(() => expect(creator.users).toHaveLength(2));
      creator.userId = 'user-1';

      await expect(creator.submit()).resolves.toBe(1);
      expect(createGrant).toHaveBeenCalledWith(
        expect.objectContaining({ scope: PermissionScope.SYSTEM, scopeId: '' }),
      );
    });
  });

  it('answers null on failure, so the dialog stays open on what was typed', async () => {
    createGrant.mockRejectedValue(new Error('nope'));

    await withCreator(role(), async creator => {
      await waitFor(() => expect(creator.organizations).toHaveLength(2));

      creator.userId = 'user-2';
      creator.toggle({ id: 'org-1', name: 'Acme' });

      await expect(creator.submit()).resolves.toBeNull();
    });
  });

  it('clears the previous attempt when the dialog is reopened', async () => {
    await withCreator(role(), async creator => {
      await waitFor(() => expect(creator.organizations).toHaveLength(2));

      creator.userId = 'user-1';
      creator.toggle({ id: 'org-1', name: 'Acme' });

      creator.reset();

      expect(creator.userId).toBe('');
      expect(creator.selectedCount).toBe(0);
      expect(creator.browseOrgId).toBeNull();
    });
  });
});

describe('createGrantCreator — from an organization', () => {
  const ACME = { kind: 'organization' as const, organizationId: 'org-1', organizationName: 'Acme' };
  let listMembers: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    listMembers = vi
      .fn()
      .mockResolvedValue(ScyllaResult.success([{ userId: 'user-1', username: 'dave' }]));
    restoreRegistry();
    restoreRegistry = withRegistry({
      roles: {
        permissionRepository: {
          listRoles,
          listGrants,
          createGrant,
          getMyPermissions: vi.fn().mockResolvedValue(ScyllaResult.success({ scopes: [] })),
        },
        updateRole: { execute: vi.fn() },
      },
      user: { userRepository: { getAll: getAllUsers } },
      organization: { organizationRepository: { getMine, listMembers } },
      project: { projectRepository: { getByOrganizationId: getProjects } },
    });
  });

  const withOrganizationCreator = async (
    forRole: RoleEntity,
    body: (creator: ReturnType<typeof createGrantCreator>) => Promise<void> | void,
  ) => {
    let creator!: ReturnType<typeof createGrantCreator>;
    const cleanup = $effect.root(() => {
      creator = createGrantCreator(
        () => forRole,
        () => ACME,
        () => [grant()],
      );
    });

    try {
      await body(creator);
    } finally {
      cleanup();
    }
  };

  it('offers the members of the organization, not the user directory', async () => {
    await withOrganizationCreator(role(), async creator => {
      await waitFor(() => expect(creator.users).toEqual([{ id: 'user-1', name: 'dave' }]));
      expect(getAllUsers).not.toHaveBeenCalled();
      expect(listMembers).toHaveBeenCalledWith('org-1');
    });
  });

  it('binds to this organization only, with no organization to pick', async () => {
    await withOrganizationCreator(role({ scope: PermissionScope.PROJECT }), creator => {
      expect(creator.isOrganizationFixed).toBe(true);
      expect(creator.organizations).toEqual([{ id: 'org-1', name: 'Acme' }]);
      expect(creator.browseOrgId).toBe('org-1');
      expect(getMine).not.toHaveBeenCalled();

      creator.reset();
      expect(creator.browseOrgId).toBe('org-1');
    });
  });

  it('reads eligibility from the grants the page passes, not the system-wide list', async () => {
    await withOrganizationCreator(role({ scope: PermissionScope.PROJECT }), async creator => {
      await waitFor(() => expect(creator.users).toHaveLength(1));
      expect(creator.users[0].ineligible).toBeUndefined();
      expect(listGrants).not.toHaveBeenCalled();
    });
  });

  it('refuses a role for apps: this dialog grants to people', async () => {
    await withOrganizationCreator(role({ kind: RoleKind.AGENT }), creator => {
      expect(creator.isAppsOnly).toBe(true);
    });
  });

  const holdingOnAcme = (...permissions: Permission[]) =>
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

  it('never asks for the members or the catalog without their permissions', async () => {
    holdingOnAcme(Permission.MANAGE_ORG_GRANTS);

    await withOrganizationCreator(role(), async creator => {
      await waitFor(() => expect(creator.mayGrant).toBe(true));
      expect(listMembers).not.toHaveBeenCalled();
      expect(listRoles).not.toHaveBeenCalled();
      expect(creator.users).toEqual([]);
    });
  });

  it('asks the grant permission of the role scope: the project one for a project role', async () => {
    holdingOnAcme(Permission.MANAGE_PROJECT_GRANTS);

    await withOrganizationCreator(role({ scope: PermissionScope.PROJECT }), creator => {
      expect(creator.mayGrant).toBe(true);
    });
    await withOrganizationCreator(role({ scope: PermissionScope.ORGANIZATION }), creator => {
      expect(creator.mayGrant).toBe(false);
    });
  });
});
