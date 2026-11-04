import type { AccessEntryEntity } from '@base/features/access';
import { roleRank } from '@base/features/access';
import { PermissionScope } from '@platform/authz';

/**
 * `INHERITED`: from an enclosing scope (a workspace role reaching a project), or an owner of a
 * workspace. It cannot be edited from this view.
 */
export enum MemberRoleOrigin {
  DIRECT = 'direct',
  INHERITED = 'inherited',
}

export interface MemberRole {
  /** Unique among the roles of one member: its scope and its role. */
  grantId: string;
  userId: string;
  roleId: string;
  origin: MemberRoleOrigin;
  scope: PermissionScope;
}

/** On the server, holding a role is belonging. */
export interface ScopeMember {
  userId: string;
  roles: MemberRole[];
}

/** The owners are a list of their own, not a role that `Revoke` takes back. */
const OWNER = 'owner';

const byRank = (a: MemberRole, b: MemberRole) => roleRank(a.roleId) - roleRank(b.roleId);

const collect = (
  sources: { entries: AccessEntryEntity[]; scope: PermissionScope; editable: boolean }[],
): ScopeMember[] => {
  const byUser = new Map<string, ScopeMember>();
  for (const { entries, scope, editable } of sources) {
    for (const entry of entries) {
      // A member is a person: the apps are on their own page.
      if (entry.actorKind !== 'user') continue;
      const member = byUser.get(entry.actorId) ?? { userId: entry.actorId, roles: [] };
      byUser.set(entry.actorId, member);
      const grantId = `${scope}:${entry.role}`;
      if (member.roles.some(role => role.grantId === grantId)) continue;
      member.roles.push({
        grantId,
        userId: entry.actorId,
        roleId: entry.role,
        origin:
          editable && entry.role !== OWNER ? MemberRoleOrigin.DIRECT : MemberRoleOrigin.INHERITED,
        scope,
      });
    }
  }
  for (const member of byUser.values()) member.roles.sort(byRank);
  return [...byUser.values()];
};

/** The roles on a workspace, its owners included. */
export const buildOrganizationMembers = (entries: AccessEntryEntity[]): ScopeMember[] =>
  collect([{ entries, scope: PermissionScope.ORGANIZATION, editable: true }]);

/** Each member once, with the roles of the project and the workspace roles that reach it. */
export const buildProjectMembers = (
  projectEntries: AccessEntryEntity[],
  workspaceEntries: AccessEntryEntity[],
): ScopeMember[] =>
  collect([
    { entries: projectEntries, scope: PermissionScope.PROJECT, editable: true },
    // Each role of a workspace reads its projects.
    { entries: workspaceEntries, scope: PermissionScope.ORGANIZATION, editable: false },
  ]);
