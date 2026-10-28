import { humanizeRoleId, RoleKind, type GrantableRole, type RoleEntity } from '@base/features/roles';

export interface AssignableRole {
  roleId: string;
  name: string;
  description: string;
  /** A role of the organization, as opposed to a platform role. */
  ownedByOrganization: boolean;
  role?: RoleEntity;
}

/** A member is a person: a role for apps is never offered. The full role comes from `roleById`. */
export const assignableForPeople = (
  grantable: readonly GrantableRole[],
  roleById: ReadonlyMap<string, RoleEntity>,
): AssignableRole[] =>
  grantable
    .filter(entry => entry.kind !== RoleKind.AGENT)
    .map(entry => {
      const role = roleById.get(entry.id);
      return {
        roleId: entry.id,
        name: role?.name || entry.name || humanizeRoleId(entry.id),
        description: role?.description || entry.description,
        ownedByOrganization: entry.ownerOrganizationId !== undefined,
        role,
      };
    });

export interface AssignableRoleGroup {
  owner: 'organization' | 'platform';
  roles: AssignableRole[];
}

/** The roles of the organization first, then the platform roles. An empty group is left out. */
export const groupAssignableRoles = (roles: readonly AssignableRole[]): AssignableRoleGroup[] =>
  (
    [
      { owner: 'organization', roles: roles.filter(role => role.ownedByOrganization) },
      { owner: 'platform', roles: roles.filter(role => !role.ownedByOrganization) },
    ] satisfies AssignableRoleGroup[]
  ).filter(group => group.roles.length > 0);
