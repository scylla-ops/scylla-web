import type { JobEntity } from '@base/features/jobs/domain/entities/job.entity.ts';
import type { JobLog, JobLogStream } from '@base/features/jobs/domain/structs/job.struct.ts';
import type { ScyllaResult } from '@shared/utils/scylla-result.ts';
import type { PaginationParams, PaginatedList } from '@scylla/ui/structs';

export interface JobsRepository {
  getByPipelineId(
    pipelineId: string,
    pagination?: PaginationParams,
  ): Promise<ScyllaResult<PaginatedList<JobEntity>>>;
  /** Most recent first. Scoped by the backend to what the caller may see. */
  getByOrganizationId(
    organizationId: string,
    pagination?: PaginationParams,
  ): Promise<ScyllaResult<PaginatedList<JobEntity>>>;
  getById(jobId: string): Promise<ScyllaResult<JobEntity>>;
  deleteById(jobId: string): Promise<ScyllaResult<void>>;
  getLogs(
    jobId: string,
    nodeId?: string,
    pagination?: PaginationParams,
  ): Promise<ScyllaResult<PaginatedList<JobLog>>>;
  tailLogs(jobId: string, nodeId?: string): ScyllaResult<JobLogStream>;
}
