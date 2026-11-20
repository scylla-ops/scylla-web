import type { JobsRepository } from '@base/features/jobs/domain/repository/jobs.repository.ts';
import type {
  JobEntity,
  JobFilter,
  JobLogStream,
  NewestJobsQuery,
} from '@base/features/jobs/domain/entities/job.entity.ts';
import type { JobStats, JobStatsQuery } from '@base/features/jobs/domain/structs/job-stats.struct.ts';
import { Timestamp } from '@base/generated/google/protobuf/timestamp.ts';
import type { IJobServiceClient } from '@base/generated/scylla/pipelines/v1/job_service.client.ts';
import { JobView } from '@base/generated/scylla/pipelines/v1/job_service.ts';
import type { Job } from '@base/generated/scylla/pipelines/v1/job.ts';
import { idValue, required, wrapId } from '@shared/infrastructure/grpc/wrappers.ts';
import { DEFAULT_PAGE_SIZE, type PaginationParams, type PaginatedList } from '@scylla/ui/structs';
import * as grpcJob from './grpc-job.mapper.ts';
import * as grpcJobStats from './grpc-job-stats.mapper.ts';

const PAGE_SIZE = 100;
const FIRST_PAGE: PaginationParams = { page: 1, pageSize: DEFAULT_PAGE_SIZE };

/** Reads each page of a list. */
const allPages = async (
  read: (token: string) => Promise<{ jobs: Job[]; next: string }>,
): Promise<Job[]> => {
  const jobs: Job[] = [];
  let token = '';
  do {
    const page = await read(token);
    jobs.push(...page.jobs);
    token = page.next;
  } while (token);
  return jobs;
};

export class DefaultJobsRepository implements JobsRepository {
  constructor(private readonly client: IJobServiceClient) {}

  public async getByPipelineId(
    pipelineId: string,
    pagination: PaginationParams = FIRST_PAGE,
    filter?: JobFilter,
  ): Promise<PaginatedList<JobEntity>> {
    const jobs = await allPages(async token => {
      const response = await this.client.listPipelineJobs({
        pipelineId: wrapId(pipelineId),
        page: { size: PAGE_SIZE, token },
        ...(filter && { filter: grpcJob.filterToProto(filter) }),
      }).response;
      return { jobs: response.jobs, next: response.page?.nextToken ?? '' };
    });
    return grpcJob.toDomainPage(jobs, pagination);
  }

  public async getByWorkspaceId(
    workspaceId: string,
    pagination: PaginationParams = FIRST_PAGE,
  ): Promise<PaginatedList<JobEntity>> {
    const jobs = await allPages(async token => {
      const response = await this.client.listWorkspaceJobs({
        workspaceId: wrapId(workspaceId),
        projectIds: [],
        pipelineIds: [],
        page: { size: PAGE_SIZE, token },
        view: JobView.UNSPECIFIED,
      }).response;
      return { jobs: response.jobs, next: response.page?.nextToken ?? '' };
    });
    return grpcJob.toDomainPage(jobs, pagination);
  }

  public async getNewestByWorkspaceId(query: NewestJobsQuery): Promise<JobEntity[]> {
    const response = await this.client.listWorkspaceJobs({
      workspaceId: wrapId(query.workspaceId),
      projectIds: [],
      pipelineIds: [],
      page: { size: query.limit, token: '' },
      filter: {
        ...grpcJob.filterToProto({}),
        statuses: (query.statuses ?? []).map(grpcJob.statusToProto),
        ...(query.createdAfter && { createdAfter: Timestamp.fromDate(query.createdAfter) }),
        ...(query.createdBefore && { createdBefore: Timestamp.fromDate(query.createdBefore) }),
      },
      view: JobView.SUMMARY,
    }).response;
    return response.jobs.map(grpcJob.toDomain);
  }

  public async getStats(query: JobStatsQuery): Promise<JobStats> {
    const response = await this.client.getJobStats(grpcJobStats.queryToProto(query)).response;
    return grpcJobStats.toDomain(response);
  }

  public async getById(jobId: string): Promise<JobEntity> {
    const { job } = await this.client.getJob({ jobId: wrapId(jobId) }).response;
    return grpcJob.toDomain(required(job, 'job'));
  }

  public async deleteById(jobId: string): Promise<void> {
    await this.client.deleteJob({ jobId: wrapId(jobId) }).response;
  }

  public async rerun(jobId: string): Promise<string> {
    const { job } = await this.client.rerunJob({ jobId: wrapId(jobId) }).response;
    return required(idValue(job?.id), 'job id');
  }

  public async cancel(jobId: string): Promise<void> {
    await this.client.cancelJob({ jobId: wrapId(jobId) }).response;
  }

  public async approve(jobId: string): Promise<JobEntity> {
    const { job } = await this.client.approveJob({ jobId: wrapId(jobId) }).response;
    return grpcJob.toDomain(required(job, 'job'));
  }

  public async reject(jobId: string): Promise<JobEntity> {
    const { job } = await this.client.rejectJob({ jobId: wrapId(jobId) }).response;
    return grpcJob.toDomain(required(job, 'job'));
  }

  /** A failure ends `logs` with a throw; `cancel` aborts the call. */
  public tailLogs(jobId: string, nodeId?: string): JobLogStream {
    const abortController = new AbortController();
    const call = this.client.tailJobLogs(
      { jobId: wrapId(jobId), nodeId: nodeId ?? '', after: '' },
      { abort: abortController.signal },
    );

    return {
      logs: {
        async *[Symbol.asyncIterator]() {
          for await (const event of call.responses) {
            yield* grpcJob.logLinesToDomain(jobId, event.nodeId, event.cursor, event.lines);
          }
        },
      },
      cancel: () => abortController.abort(),
    };
  }
}
