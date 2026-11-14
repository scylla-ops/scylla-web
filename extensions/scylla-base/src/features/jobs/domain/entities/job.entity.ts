import type { JobStatus } from '@shared/domain/structs/job-status.struct.ts';

export interface JobEntity {
  id: string;
  pipelineId: string;
  status: JobStatus;
  nodeExecutions: JobNodeExecution[];
  createdAt: string;
  updatedAt: string;
  /** When a worker picked it up. Unset while pending. */
  startedAt?: string;
  finishedAt?: string;
  /** Why the job failed. Unset for another job. */
  error?: string;
  /** The agent that the server gave the job to. Unset before that, or after its delete. */
  agentId?: string;
  /** The commit and the event of the job. Unset for a job with no code. */
  source?: JobSource;
  /** Only a job from a fork has one. */
  approval?: JobApproval;
  /** The file of a job of a file pipeline. Unset for a pipeline of the editor. */
  pipelineFile?: PipelineFileRef;
  /** The errors of an invalid pipeline file: the job failed with no node. Unset for a valid file. */
  fileErrors?: PipelineFileError[];
  /** The checkout of the code before the first node. Unset for a job with no checkout. */
  checkout?: JobCheckout;
  /** Why a pending job waits, as a stable code: `NO_AGENT_WITH_CHECKOUT`. */
  waitingReason?: string;
}

export type GitProvider = 'github' | 'gitlab';

/** A pull request on GitHub, a merge request on GitLab. */
export interface PullRequestRef {
  number: number;
  title: string;
  url: string;
}

export interface JobSource {
  provider: GitProvider;
  /** The full name, for example acme/api. */
  repository: string;
  repositoryUrl: string;
  sha: string;
  commitUrl: string;
  /** Empty for a tag or a SHA. */
  branch: string;
  /** Empty for a branch or a SHA. */
  tag: string;
  pullRequests: PullRequestRef[];
  fromFork: boolean;
  /** The full name of the fork. Empty when the commit is not from a fork. */
  forkRepository: string;
  /** Empty when the provider does not know it. */
  authorLogin: string;
  authorAvatarUrl: string;
  /** The first line of the message of the commit. */
  title: string;
  /** Unset for an event newer than this build. */
  event?: JobEvent;
}

export type ApprovalState = 'waiting' | 'approved' | 'rejected';

export interface JobApproval {
  state: ApprovalState;
  /** The actor that decided. Unset while the job waits. */
  decidedBy?: string;
  decidedAt?: string;
  /** True when the pull request changes a file in .scylla/. */
  changesPipelineFiles: boolean;
  /** The changes of the pull request on the provider. */
  changesUrl: string;
}

export interface PipelineFileRef {
  path: string;
  commitSha: string;
  /** The file at the commit on the provider. */
  url: string;
}

export interface PipelineFileError {
  /** Empty for an error of the lookup that is not about one file. */
  path: string;
  /** From 1. 0 when the error has no place in the file. */
  line: number;
  column: number;
  /** The path of the value, for example nodes[2].needs[0]. */
  field: string;
  message: string;
  warning: boolean;
}

export interface JobCheckout {
  state: NodeExecutionState;
  startedAt?: string;
  finishedAt?: string;
  error?: string;
}

/** The event that started a job with a commit. */
export type JobEvent = 'push' | 'pull_request' | 'tag' | 'manual' | 'provider_rerun' | 'trigger';

/** A job must match each field that is set. A job with no commit matches no filter. */
export interface JobFilter {
  branch?: string;
  event?: JobEvent;
  /** The login of the author of the commit on the provider. */
  authorLogin?: string;
  pullRequest?: number;
}

/** `unknown`: an outcome newer than this build. */
export type NodeExecutionState =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'skipped'
  | 'unknown';

export interface JobNodeExecution {
  id: string;
  state: NodeExecutionState;
  startedAt?: string;
  finishedAt?: string;
  attempts: number;
  maxAttempts: number;
}

export interface JobLog {
  id: string;
  jobId: string;
  nodeId: string;
  stream: string;
  line: string;
  timestamp: string;
}

export interface JobLogStream {
  logs: AsyncIterable<JobLog>;
  cancel: () => void;
}
