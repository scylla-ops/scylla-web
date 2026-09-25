import type { JobNodeExecution } from '@base/features/jobs/domain/structs/job.struct.ts';

export interface JobEntity {
  id: string;
  pipelineId: string;
  status: string;
  nodeExecutions: JobNodeExecution[];
  createdAt: string;
  updatedAt: string;
  /** When a worker picked it up. Unset while pending. */
  startedAt?: string;
  finishedAt?: string;
}
