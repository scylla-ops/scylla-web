import type {
  JobEntity,
  JobFilter,
  JobLogStream,
} from '@base/features/jobs/domain/entities/job.entity.ts';
import type { PaginationParams, PaginatedList } from '@scylla/ui/structs';

export interface JobsRepository {
  getByPipelineId(
    pipelineId: string,
    pagination?: PaginationParams,
    filter?: JobFilter,
  ): Promise<PaginatedList<JobEntity>>;
  /** Most recent first. Scoped by the backend to what the caller may see. */
  getByWorkspaceId(
    workspaceId: string,
    pagination?: PaginationParams,
  ): Promise<PaginatedList<JobEntity>>;
  getById(jobId: string): Promise<JobEntity>;
  deleteById(jobId: string): Promise<void>;
  rerun(jobId: string): Promise<string>;
  /** A pending or running job stops; a job that ended stays as it is. */
  cancel(jobId: string): Promise<void>;
  /** A job from a fork that waits runs, with no secret value. Gives the job after the change. */
  approve(jobId: string): Promise<JobEntity>;
  /** A job from a fork that waits is cancelled. Gives the job after the change. */
  reject(jobId: string): Promise<JobEntity>;
  /** The lines since the start, then the live lines until the job ends. */
  tailLogs(jobId: string, nodeId?: string): JobLogStream;
}
