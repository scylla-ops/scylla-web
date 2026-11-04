import { PermissionScope } from '@platform/authz';
import { activeLocale } from '@scylla/ui/i18n';
import { roleLabel } from '@base/features/access';
import { assignableForPeople } from '@base/features/membership/presentation/presenters/assignable-roles.presenter.ts';

export type { AssignableRole } from '@base/features/membership/presentation/presenters/assignable-roles.presenter.ts';

/** The fixed roles that a member view can hand out at `scope`. No call: the roles are in code. */
export const createAssignableRoles = (scope: PermissionScope) => {
  const kind = scope === PermissionScope.PROJECT ? 'project' : 'workspace';
  // Reading the locale rebuilds the labels on a switch.
  const assignableRoles = $derived((activeLocale(), assignableForPeople(kind)));

  return {
    get assignableRoles() {
      return assignableRoles;
    },
    get isLoading() {
      return false;
    },
    labelFor: (roleId: string): string => roleLabel(roleId),
  };
};

export type AssignableRoles = ReturnType<typeof createAssignableRoles>;
