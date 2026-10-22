import { can, Permission } from '@platform/authz';
import { createQuery } from '@scylla/core-sdk';
import { roleOwnerOf, type RoleEntity } from '@base/features/roles/domain/entities/role.entity.ts';
import { roleQueries } from '@base/features/roles/presentation/roles.queries.ts';
import {
  organizationIdOf,
  rolesNavigation,
  type RolesScope,
} from '@base/features/roles/presentation/ui/components/roles-page.state.svelte.ts';

/**
 * The page that creates a role of a scope, or edits one of its roles (`roleId`). The role comes
 * from the catalog the list reads: the same query, the same cache entry.
 */
export const createRoleEditorView = (scope: () => RolesScope, roleId: () => string | undefined) => {
  const isOrganization = $derived(scope().kind === 'organization');
  const organizationId = $derived(organizationIdOf(scope()));
  const isEdit = $derived(roleId() !== undefined);

  const canManageRoles = $derived(
    isOrganization
      ? can(Permission.MANAGE_ORG_ROLES, { organizationId: organizationId ?? undefined })
      : can(Permission.MANAGE_ROLES),
  );

  const catalogQuery = createQuery(() =>
    roleQueries.catalog({ enabled: isEdit && !isOrganization }),
  );
  const organizationCatalogQuery = createQuery(() =>
    roleQueries.organizationCatalog(organizationId, {
      enabled: isEdit && isOrganization && canManageRoles,
    }),
  );
  const query = $derived(isOrganization ? organizationCatalogQuery : catalogQuery);

  /** A builtin role, or a platform role seen from an organization, is not edited here. */
  const isEditable = (role: RoleEntity) =>
    role.origin.kind === 'custom' && (!isOrganization || roleOwnerOf(role) === organizationId);

  const role = $derived.by(() => {
    const id = roleId();
    if (id === undefined) return null;
    const found = (query.data ?? []).find(candidate => candidate.id === id);
    return found && isEditable(found) ? found : null;
  });

  const navigation = $derived(rolesNavigation(scope()));

  return {
    get isEdit() {
      return isEdit;
    },
    /** `null` when creating, and while an edited role loads. */
    get role() {
      return role;
    },
    get isLoading() {
      return isEdit && query.isLoading;
    },
    /** Edit asked for a role that this author cannot edit here, or that does not exist. */
    get isUnavailable() {
      return isEdit && !query.isLoading && role === null;
    },
    /** Back to the list, opened on the edited role. */
    leave: () => navigation.toList(roleId()),
  };
};

export type RoleEditorView = ReturnType<typeof createRoleEditorView>;
