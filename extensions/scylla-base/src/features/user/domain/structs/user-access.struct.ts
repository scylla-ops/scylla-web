export type UserAccessScope = 'system' | 'organization' | 'project';

/** One grant of a user, with the names to show it. */
export interface UserAccess {
  grantId: string;
  scope: UserAccessScope;
  /** Absent for the system scope. */
  organizationId?: string;
  organizationName: string;
  /** Set for the project scope only. */
  projectId?: string;
  projectName: string;
  roleId: string;
  roleName: string;
}

export interface OrganizationAccess {
  organizationId: string;
  organizationName: string;
  grants: UserAccess[];
}

export interface GroupedUserAccess {
  system: UserAccess[];
  organizations: OrganizationAccess[];
}

/** The system grants apart, the others by organization, in the order of the server. */
export const groupUserAccess = (access: readonly UserAccess[]): GroupedUserAccess => {
  const system: UserAccess[] = [];
  const byOrganization = new Map<string, OrganizationAccess>();

  for (const grant of access) {
    if (grant.scope === 'system' || !grant.organizationId) {
      system.push(grant);
      continue;
    }

    const group = byOrganization.get(grant.organizationId) ?? {
      organizationId: grant.organizationId,
      organizationName: grant.organizationName,
      grants: [],
    };
    group.grants.push(grant);
    byOrganization.set(grant.organizationId, group);
  }

  return { system, organizations: [...byOrganization.values()] };
};
