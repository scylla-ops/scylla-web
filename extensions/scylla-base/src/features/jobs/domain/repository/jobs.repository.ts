import type {
  JobEntity,
  JobLog,
  JobLogStream,
} from '@base/features/jobs/domain/entities/job.entity.ts';
import type { PaginationParams, PaginatedList } from '@scylla/ui/structs';

export interface JobsRepository {
  getByPipelineId(
    pipelineId: string,
    pagination?: PaginationParams,
  ): Promise<PaginatedList<JobEntity>>;
  /** Most recent first. Scoped by the backend to what the caller may see. */
  getByOrganizationId(
    organizationId: string,
    pagination?: PaginationParams,
  ): Promise<PaginatedList<JobEntity>>;
  getById(jobId: string): Promise<JobEntity>;
  deleteById(jobId: string): Promise<void>;
  rerun(jobId: string): Promise<string>;
  getLogs(
    jobId: string,
    nodeId?: string,
    pagination?: PaginationParams,
  ): Promise<PaginatedList<JobLog>>;
  tailLogs(jobId: string, nodeId?: string): JobLogStream;
}
