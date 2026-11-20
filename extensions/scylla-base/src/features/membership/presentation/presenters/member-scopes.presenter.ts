import type { MemberRoleEntity } from '@base/features/access';

export interface ScopeRoles {
  name: string;
  roles: MemberRoleEntity[];
}

/** The projects are inside the workspace, in the order of their first role. */
export interface MemberScopes {
  workspace: ScopeRoles;
  projects: (ScopeRoles & { id: string })[];
}

export const memberScopes = (
  roles: readonly MemberRoleEntity[],
  workspaceName: string,
): MemberScopes => {
  const projects = new Map<string, ScopeRoles & { id: string }>();
  for (const role of roles) {
    if (role.scopeKind !== 'project') continue;
    const project = projects.get(role.scopeId) ?? {
      id: role.scopeId,
      name: role.scopeName,
      roles: [],
    };
    project.roles.push(role);
    projects.set(role.scopeId, project);
  }
  return {
    workspace: {
      name: workspaceName,
      roles: roles.filter(role => role.scopeKind === 'workspace'),
    },
    projects: [...projects.values()],
  };
};
