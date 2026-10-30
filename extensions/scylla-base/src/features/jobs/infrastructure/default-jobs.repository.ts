import type { JobsRepository } from '@base/features/jobs/domain/repository/jobs.repository.ts';
import type {
  JobEntity,
  JobLog,
  JobLogStream,
} from '@base/features/jobs/domain/entities/job.entity.ts';
import type { IJobServiceClient } from '@base/generated/scylla/job/v1/job.client.ts';
import { wrapId, wrapIdOpt } from '@shared/infrastructure/grpc/wrappers.ts';
import type { PaginationParams, PaginatedList } from '@scylla/ui/structs';
import * as grpcJob from './grpc-job.mapper.ts';

export class DefaultJobsRepository implements JobsRepository {
  constructor(private readonly client: IJobServiceClient) {}

  public async getByPipelineId(
    pipelineId: string,
    pagination?: PaginationParams,
  ): Promise<PaginatedList<JobEntity>> {
    const response = await this.client.listPipelineJobs({
      pipelineId: wrapId(pipelineId),
      pagination,
    }).response;
    return grpcJob.toDomainList(response);
  }

  public async getByOrganizationId(
    organizationId: string,
    pagination?: PaginationParams,
  ): Promise<PaginatedList<JobEntity>> {
    const response = await this.client.listOrganizationJobs({
      organizationId: wrapId(organizationId),
      pagination,
    }).response;
    return grpcJob.toDomainList(response);
  }

  public async getById(jobId: string): Promise<JobEntity> {
    const { job } = await this.client.getJob({ jobId: wrapId(jobId) }).response;
    if (!job) throw new Error('Job missing from GetJobResponse');
    return grpcJob.toDomain(job);
  }

  public async deleteById(jobId: string): Promise<void> {
    await this.client.deleteJob({ jobId: wrapId(jobId) }).response;
  }

  public async rerun(jobId: string): Promise<string> {
    const response = await this.client.rerunJob({ jobId: wrapId(jobId) }).response;
    if (!response.jobId?.value) throw new Error('Job id missing from RerunJobResponse');
    return response.jobId.value;
  }

  public async getLogs(
    jobId: string,
    nodeId?: string,
    pagination?: PaginationParams,
  ): Promise<PaginatedList<JobLog>> {
    const response = await this.client.listJobLogs({
      jobId: wrapId(jobId),
      nodeId: wrapIdOpt(nodeId),
      pagination,
    }).response;
    return grpcJob.logsToDomainList(response);
  }

  /** A failure ends `logs` with a throw; `cancel` aborts the call. */
  public tailLogs(jobId: string, nodeId?: string): JobLogStream {
    const abortController = new AbortController();
    const call = this.client.tailJobLogs(
      { jobId: wrapId(jobId), nodeId: wrapIdOpt(nodeId) },
      { abort: abortController.signal },
    );

    return {
      logs: {
        async *[Symbol.asyncIterator]() {
          for await (const event of call.responses) {
            if (event.log) yield grpcJob.logEntryToDomain(event.log);
          }
        },
      },
      cancel: () => abortController.abort(),
    };
  }
}
