import type { UserSummary } from '@base/features/user';
import type { CustomIconChange } from '@shared/domain/structs/custom-icon.struct.ts';
import type {
  WorkspaceEntity,
  WorkspacePage,
  WorkspaceSearch,
} from '@base/features/workspace/domain/entities/workspace.entity.ts';

export interface WorkspaceRepository {
  /**
   * The workspaces that the user of the session owns or where it has a role, with their details.
   * An instance admin also gets only its own: the others come from `listAll`.
   */
  getMine(): Promise<WorkspaceEntity[]>;
  /**
   * One page of all the workspaces of the instance, with their details. PERMISSION_DENIED without
   * an instance role that shows each workspace.
   */
  listAll(search: WorkspaceSearch): Promise<WorkspacePage>;
  /** One workspace by its slug, with its details. NOT_FOUND when the user cannot read it. */
  getBySlug(slug: string): Promise<WorkspaceEntity>;
  /** One workspace by its id, with its details. */
  getById(workspaceId: string): Promise<WorkspaceEntity>;
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
