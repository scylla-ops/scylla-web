import { can, Permission, PermissionScope, PrincipalKind } from '@platform/authz';
import { createMutation, createQueries, createQuery } from '@scylla/core-sdk';
import { SvelteURLSearchParams } from 'svelte/reactivity';
import { createFeatureSelection } from '@scylla/ui/state';
import { currentSearch, scyllaNavigate } from '@platform/context';
import { organizationQueries } from '@base/features/organization';
import { projectLookupQueries, type ProjectList } from '@base/features/project';
import { userQueries, type UserSummary } from '@base/features/user';
import { userName } from '@shared/presentation/ui';
import { roleOwnerOf, type RoleEntity } from '@base/features/roles/domain/entities/role.entity.ts';
import type { GrantEntity } from '@base/features/roles/domain/entities/grant.entity.ts';
import {
  countHoldersByRole,
  groupRolesByOwner,
  sortRolesByName,
} from '@base/features/roles/presentation/presenters/role-list.presenter.ts';
import { roleMutations, roleQueries } from '@base/features/roles/presentation/roles.queries.ts';

/**
 * Which roles a screen administers: those of one organization, beside the platform roles it
 * can only grant, or the platform roles themselves.
 */
export type RolesScope =
  | { kind: 'organization'; organizationId: string | null; organizationName: string }
  | { kind: 'platform' };

export const organizationIdOf = (scope: RolesScope): string | null =>
  scope.kind === 'organization' ? scope.organizationId : null;

/** The query parameter that names the role the list opens on. */
export const OPEN_ROLE_PARAM = 'role';

const listPathOf = (scope: RolesScope): string =>
  scope.kind === 'organization' ? 'roles' : 'platform-roles';

/** The pages of a scope: its list, opened on a role or not, and the editor. */
export const rolesNavigation = (scope: RolesScope) => ({
  toList: (roleId?: string) =>
    scyllaNavigate.goToOrgRoute(
      roleId
        ? `${listPathOf(scope)}?${OPEN_ROLE_PARAM}=${encodeURIComponent(roleId)}`
        : listPathOf(scope),
    ),
  toCreate: () => scyllaNavigate.goToOrgRoute(`${listPathOf(scope)}/new`),
  toEdit: (roleId: string) =>
    scyllaNavigate.goToOrgRoute(`${listPathOf(scope)}/${encodeURIComponent(roleId)}/edit`),
});

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
    ([...projectResults] as { data?: ProjectList }[])[0]?.data?.items ?? [],
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

  const userById = $derived(
    // Rebuilt whole by the `$derived` and never mutated after it is read.
    // eslint-disable-next-line svelte/prefer-svelte-reactivity
    new Map<string, UserSummary>(
      (isOrganization ? (membersQuery.data ?? []) : (usersQuery.data?.items ?? [])).map(user => [
        user.id,
        user,
      ]),
    ),
  );

  const principalUser = (grant: GrantEntity): UserSummary | undefined =>
    grant.principal.kind === PrincipalKind.USER ? userById.get(grant.principal.id) : undefined;

  /** The names of the holders are on their way: a missing one is not known yet. */
  const holdersLoading = $derived(isOrganization ? membersQuery.isLoading : usersQuery.isLoading);

  const isOwned = (role: RoleEntity) => !isOrganization || roleOwnerOf(role) === organizationId;
  const isSelectable = (role: RoleEntity) =>
    canManageRoles && role.origin.kind === 'custom' && isOwned(role);

  /** Builtin roles cannot be deleted, nor can a platform role from an organization. */
  const deletableRoleIds = $derived(roles.filter(isSelectable).map(role => role.id));

  const selection = createFeatureSelection('roles', () => deletableRoleIds, {
    deleteItem: (id: string) => deleteRole.mutateAsync(id),
  });

  const memberCounts = $derived(countHoldersByRole(grants));

  let activeRoleId = $state<string | null>(
    new SvelteURLSearchParams(currentSearch()).get(OPEN_ROLE_PARAM),
  );

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
    selection,
    /** `null` when the grants are out of reach: an unknown count is not zero. */
    memberCountOf: (roleId: string): number | null =>
      grantsReadable ? (memberCounts.get(roleId) ?? 0) : null,
    isSelectable,
    /** A platform role seen from an organization: granted there, edited by the platform only. */
    isReadOnly: (role: RoleEntity) => !isOwned(role),
    /** The person behind a user grant; `undefined` for an app or a user that is not known. */
    principalUser,
    get holdersLoading() {
      return holdersLoading;
    },
    /**
     * The name of a user (never its id), or the id of an app. A grant never outlives its user:
     * a holder missing from the list is one the page cannot read, not a deleted one.
     */
    principalLabel: (grant: GrantEntity): string =>
      grant.principal.kind === PrincipalKind.USER
        ? userName(principalUser(grant), 'unknown')
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
    openCreate: () => rolesNavigation(scope()).toCreate(),
    openEdit: (role: RoleEntity) => rolesNavigation(scope()).toEdit(role.id),
  };
};

export type RolesPage = ReturnType<typeof createRolesPage>;
