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
  /** Why the last attempt failed. Unset for another node. */
  error?: string;
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
