import type { MemberEntity, MemberRoleEntity } from '@base/features/access';

export const OWNER_KEY = 'owner';
const WORKSPACE_ADMIN_KEY = 'workspace-admin';

export type MemberTab = 'people' | 'apps';

/** One row of the members table of a workspace. */
export interface MemberRow {
  actorId: string;
  tab: MemberTab;
  name: string;
  handle: string;
  /** The owner and the roles on the workspace. */
  workspaceRoles: MemberRoleEntity[];
  projectRoles: MemberRoleEntity[];
  /** Every project, as admin: an owner, or a Workspace admin. */
  adminOfEachProject: boolean;
  /** The time of the oldest grant here. */
  addedAt?: Date;
}

/** How a member shows in `UserIdentity`. */
export const memberProfile = (row: { name: string; handle: string }) => ({
  displayName: row.name,
  username: row.handle,
});

const oldest = (roles: readonly MemberRoleEntity[]): Date | undefined =>
  roles
    .map(role => role.grantedAt)
    .filter((at): at is Date => at !== undefined)
    .sort((a, b) => a.getTime() - b.getTime())[0];

export const buildMemberRows = (members: readonly MemberEntity[]): MemberRow[] =>
  members.map(member => {
    const workspaceRoles = member.roles.filter(role => role.scopeKind === 'workspace');
    const projectRoles = member.roles.filter(role => role.scopeKind === 'project');
    const addedAt = oldest([...workspaceRoles, ...projectRoles]);
    return {
      actorId: member.actorId,
      tab: member.actorKind === 'user' ? 'people' : 'apps',
      name: member.displayName,
      handle: member.handle,
      workspaceRoles,
      projectRoles,
      adminOfEachProject: workspaceRoles.some(
        role => role.roleKey === OWNER_KEY || role.roleKey === WORKSPACE_ADMIN_KEY,
      ),
      ...(addedAt ? { addedAt } : {}),
    };
  });

export const filterMemberRows = (
  rows: readonly MemberRow[],
  tab: MemberTab,
  search: string,
): MemberRow[] => {
  const text = search.trim().toLowerCase();
  return rows.filter(
    row =>
      row.tab === tab &&
      (!text || row.name.toLowerCase().includes(text) || row.handle.toLowerCase().includes(text)),
  );
};

/** The scope of the roles of one row of the members of a project, for the "Comes from" column. */
export interface ProjectMemberRow {
  actorId: string;
  tab: MemberTab;
  name: string;
  handle: string;
  roles: MemberRoleEntity[];
  /** The scopes of the roles, nearest first, each one once. */
  scopes: Pick<MemberRoleEntity, 'scopeKind' | 'scopeName'>[];
  /** No role on the project: the row only shows, and it says where to change a role. */
  inheritedOnly: boolean;
}

const RANK = { project: 0, workspace: 1 } as const;

export const buildProjectMemberRows = (members: readonly MemberEntity[]): ProjectMemberRow[] =>
  members
    .map(member => {
      const roles = [...member.roles].sort((a, b) => RANK[a.scopeKind] - RANK[b.scopeKind]);
      const kinds = [...new Set(roles.map(role => role.scopeKind))];
      const tab: MemberTab = member.actorKind === 'user' ? 'people' : 'apps';
      return {
        actorId: member.actorId,
        tab,
        name: member.displayName,
        handle: member.handle,
        roles,
        scopes: kinds.map(kind => ({
          scopeKind: kind,
          scopeName: roles.find(role => role.scopeKind === kind)?.scopeName ?? '',
        })),
        inheritedOnly: !kinds.includes('project'),
      };
    })
    .sort((a, b) => Number(a.inheritedOnly) - Number(b.inheritedOnly));
