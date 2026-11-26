import type { UserSummary } from '@base/features/user';
import type { CustomIconChange } from '@shared/domain/structs/custom-icon.struct.ts';
import type { WorkspaceEntity } from '@base/features/workspace/domain/entities/workspace.entity.ts';

export interface WorkspaceRepository {
  /** The workspaces where the user of the session has a role. */
  getMine(): Promise<WorkspaceEntity[]>;
  /** The actors with a role on the workspace. */
  listMembers(workspaceId: string): Promise<UserSummary[]>;
  /** An absent slug: the server makes one from the name. */
  create: (name: string, slug?: string) => Promise<WorkspaceEntity>;
  /** An absent field stays unchanged. INVALID_ARGUMENT on `icon.*` for a bad icon. */
  update: (
    workspaceId: string,
    name?: string,
    slug?: string,
    icon?: CustomIconChange,
  ) => Promise<WorkspaceEntity>;
  /** Allows or refuses the personal tokens of the users in this workspace. */
  setPersonalTokens: (workspaceId: string, enabled: boolean) => Promise<WorkspaceEntity>;
  /** An IANA name. INVALID_ARGUMENT on `time_zone` for an unknown name. */
  setTimeZone: (workspaceId: string, timeZone: string) => Promise<WorkspaceEntity>;
  /** FAILED_PRECONDITION with WORKSPACE_NOT_EMPTY while it holds projects or agents. */
  delete: (workspaceId: string) => Promise<void>;
}
