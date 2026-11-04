import { i18n } from '@lingui/core';
import { roleDescriptions, roleLabel, rolesOf, type ObjectKind } from '@base/features/access';

export interface AssignableRole {
  roleId: string;
  name: string;
  description: string;
  /** Kept for the pickers, which group the roles: every fixed role is of the workspace. */
  ownedByWorkspace: boolean;
}

/** The fixed roles that a person can get on an object of `kind`, the strongest first. */
export const assignableForPeople = (kind: ObjectKind): AssignableRole[] =>
  rolesOf(kind).map(role => ({
    roleId: role,
    name: roleLabel(role),
    description: roleDescriptions[role] ? i18n._(roleDescriptions[role]) : '',
    ownedByWorkspace: true,
  }));

export interface AssignableRoleGroup {
  owner: 'workspace' | 'platform';
  roles: AssignableRole[];
}

/** The roles of the workspace first, then the platform roles. An empty group is left out. */
export const groupAssignableRoles = (roles: readonly AssignableRole[]): AssignableRoleGroup[] =>
  (
    [
      { owner: 'workspace', roles: roles.filter(role => role.ownedByWorkspace) },
      { owner: 'platform', roles: roles.filter(role => !role.ownedByWorkspace) },
    ] satisfies AssignableRoleGroup[]
  ).filter(group => group.roles.length > 0);
