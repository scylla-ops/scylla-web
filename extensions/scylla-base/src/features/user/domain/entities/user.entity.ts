import type { PaginatedList } from '@scylla/ui/structs';

export interface UserEntity {
  userId: string;
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
export type UserSummary = Pick<UserEntity, 'userId' | 'username' | 'email' | 'displayName'>;

export type UserList = PaginatedList<UserEntity>;

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

export interface CreateUserInput {
  email: string;
  username: string;
  password: string;
  displayName?: string;
}

/** An absent field stays unchanged. An empty `displayName` removes it. */
export interface UpdateUserInput {
  userId: string;
  username?: string;
  displayName?: string;
  email?: string;
}

export interface ProfileValues {
  username: string;
  displayName: string;
  email: string;
}

/**
 * The fields of the profile form that differ from the user, trimmed, or `null` when none does.
 * The email counts only when the viewer may change it.
 */
export const profileChanges = (
  user: UserEntity,
  values: ProfileValues,
  emailEditable: boolean,
): UpdateUserInput | null => {
  const username = values.username.trim();
  const displayName = values.displayName.trim();
  const email = values.email.trim();

  const changes: UpdateUserInput = {
    userId: user.userId,
    ...(username !== user.username && { username }),
    ...(displayName !== (user.displayName ?? '') && { displayName }),
    ...(emailEditable && email !== (user.email ?? '') && { email }),
  };

  return Object.keys(changes).length > 1 ? changes : null;
};
