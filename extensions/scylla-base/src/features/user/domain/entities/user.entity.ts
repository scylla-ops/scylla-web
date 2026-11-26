import type { PaginatedList } from '@scylla/ui/structs';
import type { CustomIcon } from '@shared/domain/structs/custom-icon.struct.ts';

export interface UserEntity {
  id: string;
  /** The handle, unique across accounts, shown as `@username`. Never holds '@'. Can be empty. */
  username: string;
  /** Absent only on an old account made without one. */
  email?: string;
  displayName?: string;
  /** The URL of the photo that the user chose. */
  avatarUrl?: string;
  /** The color of the initials that the user chose: a color of the theme or `#RRGGBB`. */
  avatarColor?: string;
  /** False blocks the sign-in. */
  isActive: boolean;
  /** An admin of the instance: it manages the users. */
  instanceAdmin?: boolean;
  /** On a row of the console of the users. */
  instanceRoles?: UserInstanceRole[];
  /** On a row of the console of the users: the names, in name order. */
  workspaces?: string[];
  /** On a row of the console of the users: the same workspaces, with their icon and owner. */
  workspaceDetails?: UserWorkspaceEntity[];
  /** On a row of the console of the users. */
  lastSignInAt?: string;
  createdAt?: string;
  /** The server gives no time of the last change: the creation time. */
  updatedAt: string;
}

/** A workspace that a user owns or has a role in. */
export interface UserWorkspaceEntity {
  id: string;
  name: string;
  /** Undefined: the default icon of a workspace. */
  icon?: CustomIcon;
  /** The user of the row is an owner. */
  owner: boolean;
  /** When the user is not an owner: the first owner. Absent for a workspace with no owner. */
  ownerName?: string;
}

export interface UserInstanceRole {
  key: string;
  name: string;
  builtin: boolean;
}

/** What it takes to show a person. The member lists carry no more than this. */
export type UserSummary = Pick<
  UserEntity,
  'id' | 'username' | 'email' | 'displayName' | 'avatarUrl' | 'avatarColor'
>;

export type UserList = PaginatedList<UserEntity>;

/** A copy of the data of the own account, that the server makes at the request of its user. */
export interface AccountDataExport {
  /** One JSON document. It holds no secret: no password, no token. */
  json: string;
  /** The time of the copy, as an ISO text. */
  exportedAt: string;
}

export interface CreateUserInput {
  email: string;
  username: string;
  password: string;
  displayName?: string;
}

/**
 * A change of the avatar of the own account. An absent field stays unchanged. `image: null`
 * removes the photo, and an empty `color` gives the default color.
 */
export interface UpdateAvatarInput {
  /** The bytes of a PNG, JPEG or WebP file of 1 MB at most. */
  image?: Uint8Array | null;
  color?: string;
}

/** An absent field stays unchanged. An empty `displayName` removes it. */
export interface UpdateUserInput {
  id: string;
  username?: string;
  displayName?: string;
  email?: string;
}
