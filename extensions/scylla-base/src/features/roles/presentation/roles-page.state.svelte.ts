import { can, Permission, PermissionScope, PrincipalKind } from '@platform/authz';
import { createMutation, createQueries, createQuery } from '@scylla/core-sdk';
import { createFeatureSelection } from '@scylla/ui/state';
import { organizationQueries } from '@base/features/organization';
import { projectLookupQueries } from '@base/features/project';
import { userQueries } from '@base/features/user';
import { roleOwnerOf, type RoleEntity } from '../domain/entities/role.entity.ts';
import type { GrantEntity } from '../domain/entities/grant.entity.ts';
import { countHoldersByRole, groupRolesByOwner, sortRolesByName } from './role-list.calculator.ts';
import { roleMutations, roleQueries } from './roles.queries.ts';

/**
 * Which roles a screen administers: those of one organization, beside the platform roles it
 * can only grant, or the platform roles themselves.
 */
export type RolesScope =
  | { kind: 'organization'; organizationId: string | null; organizationName: string }
  | { kind: 'platform' };

export const organizationIdOf = (scope: RolesScope): string | null =>
  scope.kind === 'organization' ? scope.organizationId : null;

/**
 * The roles of a scope and the grants that hold them, fetched once for the list and the detail.
 * An organization reads its own grants and those of its projects; the platform reads them all.
 */
export const createRolesPage = (scope: () => RolesScope) => {
  const isOrganization = $derived(scope().kind === 'organization');
  const organizationId = $derived(organizationIdOf(scope()));
  const target = $derived({ organizationId: organizationId ?? undefined });

  const canManageRoles = $derived(
    isOrganization ? can(Permission.MANAGE_ORG_ROLES, target) : can(Permission.MANAGE_ROLES),
  );
  const canReadOrganizationGrants = $derived(
    isOrganization && can(Permission.MANAGE_ORG_GRANTS, target),
  );

  const catalogQuery = createQuery(() => roleQueries.catalog({ enabled: !isOrganization }));
  const organizationCatalogQuery = createQuery(() =>
    roleQueries.organizationCatalog(organizationId, {
      enabled: isOrganization && canManageRoles,
    }),
  );

  const allGrantsQuery = createQuery(() => roleQueries.allGrants({ enabled: !isOrganization }));
  const organizationGrantsQuery = createQuery(() =>
    roleQueries.scopedGrants(PermissionScope.ORGANIZATION, organizationId, {
      enabled: canReadOrganizationGrants,
    }),
  );
  const projectLookup = $derived(
    projectLookupQueries(organizationId ? [organizationId] : [], canReadOrganizationGrants),
  );
  const projectResults = createQueries(() => ({ queries: projectLookup.queries }));
  const projects = $derived(
    ([...projectResults] as { data?: { projects: { id: string }[] } }[])[0]?.data?.projects ?? [],
  );
  const projectGrantResults = createQueries(() => ({
    queries: projects.map(project =>
      roleQueries.scopedGrants(PermissionScope.PROJECT, project.id, {
        enabled: can(Permission.MANAGE_PROJECT_GRANTS, {
          organizationId: organizationId ?? undefined,
          projectId: project.id,
        }),
      }),
    ),
  }));

  const membersQuery = createQuery(() =>
    organizationQueries.members(organizationId, {
      enabled: isOrganization && can(Permission.LIST_ORGANIZATION_MEMBERS, target),
    }),
  );
  const usersQuery = createQuery(() => userQueries.list({ enabled: !isOrganization }));

  const deleteRole = createMutation(() => roleMutations.remove());

  /** The platform screen lists the platform's own roles, the System ones included. */
  const groups = $derived(
    isOrganization
      ? groupRolesByOwner(organizationCatalogQuery.data ?? [], organizationId)
      : {
          organization: [],
          platform: sortRolesByName(
            (catalogQuery.data ?? []).filter(role => roleOwnerOf(role) === null),
          ),
        },
  );
  const roles = $derived([...groups.organization, ...groups.platform]);

  const grants = $derived(
    isOrganization
      ? [
          ...(organizationGrantsQuery.data ?? []),
          ...([...projectGrantResults] as { data?: GrantEntity[] }[]).flatMap(
            result => result.data ?? [],
          ),
        ]
      : (allGrantsQuery.data ?? []),
  );
  const grantsReadable = $derived(!isOrganization || canReadOrganizationGrants);

  const usernameById = $derived(
    // Rebuilt whole by the `$derived` and never mutated after it is read.
    // eslint-disable-next-line svelte/prefer-svelte-reactivity
    new Map<string, string>(
      isOrganization
        ? (membersQuery.data ?? []).map(member => [member.userId, member.username])
        : (usersQuery.data?.items ?? []).map(user => [user.userId, user.username]),
    ),
  );

  const isOwned = (role: RoleEntity) => !isOrganization || roleOwnerOf(role) === organizationId;
  const isSelectable = (role: RoleEntity) =>
    canManageRoles && role.origin.kind === 'custom' && isOwned(role);

  /** Builtin roles cannot be deleted, nor can a platform role from an organization. */
  const deletableRoleIds = $derived(roles.filter(isSelectable).map(role => role.id));

  const selection = createFeatureSelection('roles', () => deletableRoleIds, {
    deleteItem: (id: string) => deleteRole.mutateAsync(id),
  });

  const memberCounts = $derived(countHoldersByRole(grants));

  let activeRoleId = $state<string | null>(null);
  /** `null` when creating. */
  let editingRole = $state<RoleEntity | null>(null);
  let formOpen = $state(false);

  const activeRole = $derived(roles.find(role => role.id === activeRoleId) ?? null);

  return {
    get scope() {
      return scope();
    },
    get roles() {
      return roles;
    },
    get groups() {
      return groups;
    },
    get grants() {
      return grants;
    },
    get isLoading() {
      return isOrganization ? organizationCatalogQuery.isLoading : catalogQuery.isLoading;
    },
    get canManageRoles() {
      return canManageRoles;
    },
    get activeRole() {
      return activeRole;
    },
    get activeRoleId() {
      return activeRoleId;
    },
    get formOpen() {
      return formOpen;
    },
    get editingRole() {
      return editingRole;
    },
    selection,
    /** `null` when the grants are out of reach: an unknown count is not zero. */
    memberCountOf: (roleId: string): number | null =>
      grantsReadable ? (memberCounts.get(roleId) ?? 0) : null,
    isSelectable,
    /** A platform role seen from an organization: granted there, edited by the platform only. */
    isReadOnly: (role: RoleEntity) => !isOwned(role),
    /** The username, or the principal id for an app or an unknown user. */
    principalLabel: (grant: GrantEntity): string =>
      grant.principal.kind === PrincipalKind.USER
        ? (usernameById.get(grant.principal.id) ?? grant.principal.id)
        : grant.principal.id,
    canRevoke: (grant: GrantEntity): boolean => {
      if (!isOrganization) return can(Permission.MANAGE_SYSTEM_GRANTS);
      return grant.scope === PermissionScope.PROJECT
        ? can(Permission.MANAGE_PROJECT_GRANTS, { ...target, projectId: grant.scopeId })
        : can(Permission.MANAGE_ORG_GRANTS, target);
    },
    open: (roleId: string) => {
      activeRoleId = roleId;
    },
    openCreate: () => {
      editingRole = null;
      formOpen = true;
    },
    openEdit: (role: RoleEntity) => {
      editingRole = role;
      formOpen = true;
    },
    closeForm: () => {
      formOpen = false;
    },
  };
};

export type RolesPage = ReturnType<typeof createRolesPage>;
