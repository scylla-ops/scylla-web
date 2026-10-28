import type { AccessScope } from '@platform/authz';
import type { PaginatedList } from '@scylla/ui/structs';

export interface UserEntity {
  id: string;
  /** A handle, unique across accounts, shown as `@username`. Never holds '@'. */
  username: string;
  /** Absent only on an old account made without one. */
  email?: string;
  displayName?: string;
  /** False blocks the sign-in. */
  isActive: boolean;
  createdAt?: string;
  updatedAt: string;
}

/** What it takes to show a person. The member lists carry no more than this. */
export type UserSummary = Pick<UserEntity, 'id' | 'username' | 'email' | 'displayName'>;

export type UserList = PaginatedList<UserEntity>;

/** One grant of a user, with the names to show it. */
export interface UserAccess {
  grantId: string;
  scope: AccessScope;
  /** Absent for the system scope. */
  organizationId?: string;
  organizationName: string;
  /** Set for the project scope only. */
  projectId?: string;
  projectName: string;
  roleId: string;
  roleName: string;
}

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
