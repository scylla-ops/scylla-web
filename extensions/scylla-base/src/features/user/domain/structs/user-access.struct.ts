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
