import type { MemberEntity, MemberRoleEntity } from '@base/features/access';

export const OWNER_KEY = 'owner';

/** A workspace role and the project role with the same power on a project, strongest first. */
const ALL_PROJECTS_ROLES: readonly (readonly [string, string])[] = [
  [OWNER_KEY, 'project-admin'],
  ['workspace-admin', 'project-admin'],
  ['workspace-member', 'project-editor'],
  ['workspace-viewer', 'project-viewer'],
  ['agent', 'project-agent'],
];

export type MemberTab = 'people' | 'apps';

/** One row of the members table of a workspace. */
export interface MemberRow {
  actorId: string;
  tab: MemberTab;
  name: string;
  handle: string;
  /** The roles on the workspace. */
  workspaceRoles: MemberRoleEntity[];
  projectRoles: MemberRoleEntity[];
  /** The key of the project role that the workspace roles equal on every project. */
  allProjectsRoleKey?: string;
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

const strongestAllProjectsRole = (workspaceRoles: readonly MemberRoleEntity[]) =>
  ALL_PROJECTS_ROLES.find(([key]) => workspaceRoles.some(role => role.roleKey === key))?.[1];

export const buildMemberRows = (members: readonly MemberEntity[]): MemberRow[] =>
  members.map(member => {
    const workspaceRoles = member.roles.filter(role => role.scopeKind === 'workspace');
    const projectRoles = member.roles.filter(role => role.scopeKind === 'project');
    const addedAt = oldest([...workspaceRoles, ...projectRoles]);
    const allProjectsRoleKey = strongestAllProjectsRole(workspaceRoles);
    return {
      actorId: member.actorId,
      tab: member.actorKind === 'user' ? 'people' : 'apps',
      name: member.displayName,
      handle: member.handle,
      workspaceRoles,
      projectRoles,
      ...(allProjectsRoleKey ? { allProjectsRoleKey } : {}),
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
