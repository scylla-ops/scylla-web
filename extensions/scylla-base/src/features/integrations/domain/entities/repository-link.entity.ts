import type { VcsProvider } from '../structs/vcs-provider.struct.ts';
import type { ConnectionState, DeliveryMode } from './vcs-connection.entity.ts';

/** A check run (GitHub only, the default there) or a commit status (the only mode on GitLab). */
export type ReportMode = 'check_run' | 'commit_status';

/** The editor of Scylla, or the files `.scylla/` of the linked repository. */
export type PipelineSource = 'editor' | 'file';

/**
 * The link of a project to its repository. A project has at most one link: the id of the project
 * designates it.
 */
export interface RepositoryLink {
  projectId: string;
  workspaceId: string;
  connectionId: string;
  provider: VcsProvider;
  /** The login of the account of the connection. */
  account: string;
  externalId: string;
  /** For example acme/api. */
  fullName: string;
  webUrl: string;
  defaultBranch: string;
  private: boolean;
  pipelineSource: PipelineSource;
  reportsEnabled: boolean;
  reportMode: ReportMode;
  deliveryMode: DeliveryMode;
  /** 60 to 900. */
  pollIntervalSeconds: number;
  /** Absent before the first webhook. */
  lastEventAt?: string;
  state: ConnectionState;
  /** A stable code, for example REPOSITORY_NOT_VISIBLE or WEBHOOK_DISABLED. Empty when active. */
  stateReason: string;
  createdBy: string;
  createdAt: string;
}

export interface LinkRepositoryInput {
  projectId: string;
  connectionId: string;
  externalId: string;
}

/** Only the fields that are set change. */
export interface UpdateRepositoryLinkInput {
  projectId: string;
  reportsEnabled?: boolean;
  reportMode?: ReportMode;
  pollIntervalSeconds?: number;
}

/** The result of a test webhook. */
export interface DeliveryTest {
  delivered: boolean;
  /** Why it did not arrive. Empty when it arrived. */
  error: string;
  link: RepositoryLink;
}

export type GitRefKind = 'branch' | 'tag';

/** A branch or a tag of a linked repository. */
export interface GitRef {
  name: string;
  kind: GitRefKind;
  sha: string;
  defaultBranch: boolean;
  webUrl: string;
}

export interface ListRefsInput {
  projectId: string;
  /** Absent: the branches and the tags. */
  kind?: GitRefKind;
  search?: string;
  pageToken?: string;
}

export interface GitRefPage {
  refs: GitRef[];
  /** Empty on the last page. */
  nextPageToken: string;
}
