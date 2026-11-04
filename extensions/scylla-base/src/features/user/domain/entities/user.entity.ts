import type { AccessScope } from '@platform/authz';
import type { PaginatedList } from '@scylla/ui/structs';

export interface UserEntity {
  id: string;
  /** The handle, unique across accounts, shown as `@username`. Never holds '@'. Can be empty. */
  username: string;
  /** Absent only on an old account made without one. */
  email?: string;
  displayName?: string;
  /** False blocks the sign-in. */
  isActive: boolean;
  /** An admin of the instance: it manages the users. */
  instanceAdmin?: boolean;
  createdAt?: string;
  /** The server gives no time of the last change: the creation time. */
  updatedAt: string;
}

/** What it takes to show a person. The member lists carry no more than this. */
export type UserSummary = Pick<UserEntity, 'id' | 'username' | 'email' | 'displayName'>;

export type UserList = PaginatedList<UserEntity>;

interface Grant {
  grantId: string;
  scope: AccessScope;
  roleId: string;
  roleName: string;
}

export interface SystemAccess extends Grant {
  scope: 'system';
}

export interface OrganizationAccess extends Grant {
  scope: 'organization';
  organizationId: string;
  organizationName: string;
}

export interface ProjectAccess extends Grant {
  scope: 'project';
  organizationId: string;
  organizationName: string;
  projectId: string;
  projectName: string;
}

/** One grant of a user, with the names to show it. Each scope carries only the names it has. */
export type UserAccess = SystemAccess | OrganizationAccess | ProjectAccess;

export interface CreateUserInput {
  email: string;
  username: string;
  password: string;
  displayName?: string;
}

/** An absent field stays unchanged. An empty `displayName` removes it. */
export interface UpdateUserInput {
  id: string;
  username?: string;
  displayName?: string;
  email?: string;
}
