import type {
  Job,
  ListPipelineJobsResponse,
  ListOrganizationJobsResponse,
  ListJobLogsResponse,
  JobLogEntry,
} from '@base/generated/scylla/job/v1/job.ts';
import type { ScyllaResult } from '@shared/utils/scylla-result.ts';
import type { PaginationParams } from '@scylla/ui/structs';

export interface JobLogsTailHandleRepo {
  responses: AsyncIterable<ScyllaResult<JobLogEntry>>;
  cancel: () => void;
}

export interface JobsRemoteDataSource {
  getByPipelineId(
    pipelineId: string,
    pagination?: PaginationParams,
  ): Promise<ScyllaResult<ListPipelineJobsResponse>>;
  getByOrganizationId(
    organizationId: string,
    pagination?: PaginationParams,
  ): Promise<ScyllaResult<ListOrganizationJobsResponse>>;
  getById(jobId: string): Promise<ScyllaResult<Job>>;
  deleteById(jobId: string): Promise<ScyllaResult<void>>;
  getLogs(
    jobId: string,
    nodeId?: string,
    pagination?: PaginationParams,
  ): Promise<ScyllaResult<ListJobLogsResponse>>;
  tailLogs(jobId: string, nodeId?: string): ScyllaResult<JobLogsTailHandleRepo>;
}
