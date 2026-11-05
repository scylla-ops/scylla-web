import type { ObjectKind } from './object-ref.struct.ts';

/**
 * The roles of the server are fixed, in code. `Grant` gives one, `Revoke` takes it back. The role
 * owner of a workspace is not in these lists: it needs `manage_owners`.
 */
export const WORKSPACE_ROLES = ['admin', 'member', 'viewer', 'runner'] as const;
export const PROJECT_ROLES = ['admin', 'editor', 'viewer'] as const;

export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];
export type ProjectRole = (typeof PROJECT_ROLES)[number];
export type FixedRole = WorkspaceRole | ProjectRole;

/** The roles that a person can get on an object, from the most to the least. */
export const rolesOf = (kind: ObjectKind): readonly FixedRole[] => {
  switch (kind) {
    case 'workspace':
      // `runner` is for the agents: a person does not run jobs.
      return WORKSPACE_ROLES.filter(role => role !== 'runner');
    case 'project':
      return PROJECT_ROLES;
    default:
      return [];
  }
};

/** The rank of a role, 0 the highest: to show the strongest role of a member first. */
export const roleRank = (role: string): number => {
  const order = ['owner', 'admin', 'editor', 'member', 'viewer', 'runner'];
  const index = order.indexOf(role);
  return index === -1 ? order.length : index;
};
