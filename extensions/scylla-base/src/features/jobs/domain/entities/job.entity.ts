import type { JobStatus } from '@shared/domain/structs/job-status.struct.ts';

export interface JobEntity {
  id: string;
  pipelineId: string;
  status: JobStatus;
  /** The nodes of the pipeline at the start of the job: the graph that the job ran. */
  nodes: JobNode[];
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

/** A need of a node: another node, and one of its ports or none. */
export interface JobNeed {
  node: string;
  port?: string;
}

/**
 * A node of the job, as the graph and the path of the job read it. `run`: a command or a script,
 * which can fail and send its failure to its `error` port.
 */
export interface JobNode {
  id: string;
  kind: 'run' | 'switch' | 'merge';
  deps: JobNeed[];
  /** The ports of a switch: its cases in order, then `otherwise`. */
  ports: string[];
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
  /** The ports that a completed switch opened. Empty for another node. */
  ports: string[];
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
