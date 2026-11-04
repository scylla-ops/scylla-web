import { i18n } from '@lingui/core';
import { roleDescriptions, roleLabel, rolesOf, type ObjectKind } from '@base/features/access';

export interface AssignableRole {
  roleId: string;
  name: string;
  description: string;
  /** Kept for the pickers, which group the roles: every fixed role is of the workspace. */
  ownedByOrganization: boolean;
}

/** The fixed roles that a person can get on an object of `kind`, the strongest first. */
export const assignableForPeople = (kind: ObjectKind): AssignableRole[] =>
  rolesOf(kind).map(role => ({
    roleId: role,
    name: roleLabel(role),
    description: roleDescriptions[role] ? i18n._(roleDescriptions[role]) : '',
    ownedByOrganization: true,
  }));

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
