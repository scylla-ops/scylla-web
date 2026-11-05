import type { UserSummary } from '@base/features/user';
import type {
  WorkspaceEntity,
  WorkspaceOwner,
} from '@base/features/workspace/domain/entities/workspace.entity.ts';

export interface WorkspaceRepository {
  /** The workspaces where the user of the session has a role, or that it owns. */
  getMine(): Promise<WorkspaceEntity[]>;
  /** The actors with a role on the workspace, and its owners. */
  listMembers(workspaceId: string): Promise<UserSummary[]>;
  /** An absent slug: the server makes one from the name. */
  create: (name: string, slug?: string) => Promise<WorkspaceEntity>;
  /** An absent field stays unchanged. */
  update: (workspaceId: string, name?: string, slug?: string) => Promise<WorkspaceEntity>;
  /** Allows or refuses the personal tokens of the users in this workspace. */
  setPersonalTokens: (workspaceId: string, enabled: boolean) => Promise<WorkspaceEntity>;
  /** FAILED_PRECONDITION with WORKSPACE_NOT_EMPTY while it holds projects or agents. */
  delete: (workspaceId: string) => Promise<void>;
  listOwners: (workspaceId: string) => Promise<WorkspaceOwner[]>;
  addOwner: (workspaceId: string, userId: string) => Promise<void>;
  /** FAILED_PRECONDITION with LAST_OWNER for the last owner. */
  removeOwner: (workspaceId: string, userId: string) => Promise<void>;
}
