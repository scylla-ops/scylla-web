import type { CustomIcon } from '@shared/domain/structs/custom-icon.struct.ts';

/** The first owner of a workspace, as a list shows it: the shape of a user identity. */
export interface WorkspaceOwnerEntity {
  id: string;
  username: string;
  displayName?: string;
  /** Only for a user that sees each workspace of the instance. */
  email?: string;
  avatarUrl?: string;
  avatarColor?: string;
}

/** A workspace of the server. The rename of the code to `workspace` comes in its own change. */
export interface WorkspaceEntity {
  id: string;
  name: string;
  /** Unique and editable: the first segment of the URLs of the workspace. */
  slug: string;
  /** False: this workspace refuses the personal tokens of its members. */
  personalTokensEnabled: boolean;
  /** An IANA name, `UTC` for a new workspace: the days and the hours of the workspace. */
  timeZone: string;
  /** Undefined: the default icon, a building in grey. */
  icon?: CustomIcon;
  createdAt?: Date;
  /** The details below come with a list. Absent: the answer had no details. */
  owner?: WorkspaceOwnerEntity;
  memberCount?: number;
  projectCount?: number;
  lastActivityAt?: Date;
  /**
   * The role of the user of the session: `owner`, `admin`, `member`, `viewer`, or the name of a
   * custom role. Empty: no role, an instance role shows the workspace.
   */
  role?: string;
}

/** The orders of the list of all the workspaces. `activity`: the last activity first. */
export type WorkspaceOrder = 'name' | 'newest' | 'oldest' | 'activity';

/** A request of the list of all the workspaces of the instance. */
export interface WorkspaceSearch {
  /** Matches the name, the slug, and the name, handle or email of an owner. */
  query: string;
  order: WorkspaceOrder;
  /** Only the workspaces where the user of the session has no role. */
  othersOnly: boolean;
  pageSize: number;
  /** Empty: the first page. */
  pageToken: string;
}

/** One page of the list of all the workspaces. */
export interface WorkspacePage {
  items: WorkspaceEntity[];
  /** Empty: the last page. */
  nextToken: string;
  /** The number of workspaces that the search keeps, on all the pages. */
  total: number;
}
