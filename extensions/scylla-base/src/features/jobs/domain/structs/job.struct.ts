import type { ScyllaResult } from '@shared/utils/scylla-result.ts';

export interface JobNodeExecution {
  id: string;
  state: string;
  startedAt?: string;
  finishedAt?: string;
  attempts: number;
  maxAttempts: number;
}

export const attemptOf = (
  node: JobNodeExecution,
): { attempt: number; maxAttempts: number } | null =>
  node.maxAttempts > 1 && node.attempts > 0
    ? { attempt: node.attempts, maxAttempts: node.maxAttempts }
    : null;

export interface JobLog {
  id: string;
  jobId: string;
  nodeId: string;
  stream: string;
  line: string;
  timestamp: string;
}

export interface JobLogStream {
  logs: AsyncIterable<ScyllaResult<JobLog>>;
  cancel: () => void;
}
