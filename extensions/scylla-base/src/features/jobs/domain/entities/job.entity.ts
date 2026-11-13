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
