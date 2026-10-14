import type { JobsRepository } from '@base/features/jobs/domain/repository/jobs.repository.ts';
import type { JobEntity } from '@base/features/jobs/domain/entities/job.entity.ts';
import type { JobLog, JobLogStream } from '@base/features/jobs/domain/structs/job.struct.ts';
import type { IJobServiceClient } from '@base/generated/scylla/job/v1/job.client.ts';
import { ScyllaError, ScyllaResult } from '@shared/utils/scylla-result.ts';
import { wrapId, wrapIdOpt } from '@shared/infrastructure/grpc/wrappers.ts';
import type { PaginationParams, PaginatedList } from '@scylla/ui/structs';
import { GrpcJobMapper } from './grpc-job.mapper.ts';

export class DefaultJobsRepository implements JobsRepository {
  constructor(private readonly client: IJobServiceClient) {}

  public getByPipelineId(
    pipelineId: string,
    pagination?: PaginationParams,
  ): Promise<ScyllaResult<PaginatedList<JobEntity>>> {
    return ScyllaResult.tryAsync(async () => {
      const response = await this.client.listPipelineJobs({
        pipelineId: wrapId(pipelineId),
        pagination,
      }).response;
      return GrpcJobMapper.toDomainList(response);
    }, 'Error fetching pipeline jobs');
  }

  public getByOrganizationId(
    organizationId: string,
    pagination?: PaginationParams,
  ): Promise<ScyllaResult<PaginatedList<JobEntity>>> {
    return ScyllaResult.tryAsync(async () => {
      const response = await this.client.listOrganizationJobs({
        organizationId: wrapId(organizationId),
        pagination,
      }).response;
      return GrpcJobMapper.toDomainList(response);
    }, 'Error fetching organization jobs');
  }

  public getById(jobId: string): Promise<ScyllaResult<JobEntity>> {
    return ScyllaResult.tryAsync(async () => {
      const { job } = await this.client.getJob({ jobId: wrapId(jobId) }).response;
      if (!job) throw new ScyllaError('Job missing from GetJobResponse');
      return GrpcJobMapper.toDomain(job);
    }, 'Error fetching job');
  }

  public deleteById(jobId: string): Promise<ScyllaResult<void>> {
    return ScyllaResult.tryAsync(async () => {
      await this.client.deleteJob({ jobId: wrapId(jobId) }).response;
    }, 'Error deleting job');
  }

  public getLogs(
    jobId: string,
    nodeId?: string,
    pagination?: PaginationParams,
  ): Promise<ScyllaResult<PaginatedList<JobLog>>> {
    return ScyllaResult.tryAsync(async () => {
      const response = await this.client.listJobLogs({
        jobId: wrapId(jobId),
        nodeId: wrapIdOpt(nodeId),
        pagination,
      }).response;
      return GrpcJobMapper.logsToDomainList(response);
    }, 'Error fetching job logs');
  }

  /** An error ends the stream as its last item; `cancel` aborts the call. */
  public tailLogs(jobId: string, nodeId?: string): ScyllaResult<JobLogStream> {
    const abortController = new AbortController();

    return ScyllaResult.try<JobLogStream>(() => {
      const call = this.client.tailJobLogs(
        { jobId: wrapId(jobId), nodeId: wrapIdOpt(nodeId) },
        { abort: abortController.signal },
      );

      return {
        logs: {
          async *[Symbol.asyncIterator]() {
            try {
              for await (const event of call.responses) {
                if (event.log)
                  yield ScyllaResult.success(GrpcJobMapper.logEntryToDomain(event.log));
              }
            } catch (err) {
              yield ScyllaResult.error(new ScyllaError('Error tailing job logs', { cause: err }));
            }
          },
        },
        cancel: () => abortController.abort(),
      };
    }, 'Error tailing job logs');
  }
}
