import { Permission, authorizationReady, can, type PermissionScope } from '@platform/authz';
import { createQuery } from '@scylla/core-sdk';
import { humanizeRoleId, roleQueries } from '@base/features/roles';
import { assignableForPeople } from './assignable-roles.calculator.ts';

export type { AssignableRole } from './assignable-roles.calculator.ts';

/**
 * The roles a member view can hand out at `scope`: what `ListGrantableRoles` returns, the roles
 * of the organization included when the caller may read it. The list is asked for every scope:
 * a role inherited from the organization shows on a project page, and needs its name there. The full role, for its permissions,
 * comes from the catalog the caller may read: every role with `MANAGE_ROLES`, the platform and
 * organization roles with `MANAGE_ORG_ROLES`, none otherwise.
 */
export const createAssignableRoles = (
  scope: PermissionScope,
  organizationId: () => string | null,
) => {
  const target = $derived({ organizationId: organizationId() ?? undefined });
  const canReadCatalog = $derived(can(Permission.MANAGE_ROLES));
  const canReadOrganizationCatalog = $derived(
    !canReadCatalog && can(Permission.MANAGE_ORG_ROLES, target),
  );
  const canReadOrganization = $derived(can(Permission.READ_ORGANIZATION, target));

  const catalogQuery = createQuery(() => roleQueries.catalog({ enabled: canReadCatalog }));
  const organizationCatalogQuery = createQuery(() =>
    roleQueries.organizationCatalog(organizationId(), { enabled: canReadOrganizationCatalog }),
  );
  const grantableQuery = createQuery(() =>
    roleQueries.grantable(undefined, canReadOrganization ? organizationId() : null, {
      enabled: authorizationReady(),
    }),
  );

  const roles = $derived(catalogQuery.data ?? organizationCatalogQuery.data ?? []);
  const grantableRoles = $derived(grantableQuery.data ?? []);

  /** Empty when no catalog is in reach. */
  // Rebuilt whole by the `$derived` and never mutated after it is read, so a
  // reactive collection would only make a throwaway object track dependencies.
  // eslint-disable-next-line svelte/prefer-svelte-reactivity
  const roleById = $derived(new Map(roles.map(role => [role.id, role])));

  const assignableRoles = $derived(
    assignableForPeople(
      grantableRoles.filter(entry => entry.scope === scope),
      roleById,
    ),
  );

  const nameById = $derived(
    // Rebuilt whole by the `$derived` and never mutated after it is read, so a
    // reactive collection would only make a throwaway object track dependencies.
    // eslint-disable-next-line svelte/prefer-svelte-reactivity
    new Map(
      grantableRoles
        .map(entry => [entry.roleId, roleById.get(entry.roleId)?.name || entry.name] as const)
        .filter(([, name]) => name !== ''),
    ),
  );

  return {
    get assignableRoles() {
      return assignableRoles;
    },
    get roleById() {
      return roleById;
    },
    get isLoading() {
      return grantableQuery.isLoading;
    },
    /** Any role id, even one of another scope or no longer in the catalog. */
    labelFor: (roleId: string): string =>
      nameById.get(roleId) ?? roleById.get(roleId)?.name ?? humanizeRoleId(roleId),
  };
};

export type AssignableRoles = ReturnType<typeof createAssignableRoles>;
