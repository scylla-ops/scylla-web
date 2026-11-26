import { getQueryClient, mutationOptions, queryOptions, getModuleDomain } from '@scylla/core-sdk';
import { scyllaNavigate } from '@platform/context';
import type { PaginationParams, PaginatedList } from '@scylla/ui/structs';
import type { JobEntity, JobFilter, NewestJobsQuery } from '../domain/entities/job.entity.ts';
import type { JobStats, JobStatsQuery } from '../domain/structs/job-stats.struct.ts';
import { isActiveStatus } from '@shared/domain/structs/job-status.struct.ts';
import { summarizeJobs } from './presenters/jobs-summary.presenter.ts';
import type { JobsModule } from '../jobs.module.ts';
import {
  JOBS_QUERY_KEY,
  JOBS_QUERY_ROOT,
  JOB_QUERY_KEY,
  JOB_STATS_QUERY_KEY,
  NEWEST_JOBS_QUERY_KEY,
  WORKSPACE_JOBS_QUERY_KEY,
} from './jobs.query-keys.ts';

// Resolved per call: tests swap the registry.
const repository = () => getModuleDomain<typeof JobsModule.domain>('jobs').jobsRepository;

/** The most bars of the history of a pipeline in the pipelines list. */
const MAX_JOBS_PER_PIPELINE = 30;

/** The dashboard's figures are computed over this window: the backend does not aggregate. */
export const WORKSPACE_JOBS_WINDOW: PaginationParams = { page: 1, pageSize: 100 };

const hasActive = (jobs: readonly JobEntity[]) => jobs.some(job => isActiveStatus(job.status));

/** The figures refresh each minute: the design of the dashboard asks for it. */
const STATS_REFRESH_MS = 60_000;

/**
 * A query of a period. `scope` names the period in the key: a preset and the zone, or the
 * days. `range` gives its instants when the query runs, because the instants of a preset move
 * with the clock.
 */
export interface PeriodScope<TRange> {
  scope: readonly unknown[];
  range: () => TRange;
}

/** What `jobQueries.stats` counts, except the workspace and the period. */
export type JobStatsShape = Omit<JobStatsQuery, 'workspaceId' | 'from' | 'to'>;

/** What `jobQueries.newest` lists, except the workspace and the period. */
export type NewestJobsShape = Omit<
  NewestJobsQuery,
  'workspaceId' | 'createdAfter' | 'createdBefore'
>;

export const jobQueries = {
  /** Polled while it runs; the polling stops at a finished status. */
  byId: (jobId: string) =>
    queryOptions<JobEntity>({
      queryKey: JOB_QUERY_KEY(jobId),
      enabled: !!jobId,
      queryFn: () => repository().getById(jobId),
      refetchInterval: query => {
        const status = query.state.data?.status;
        if (!status || status === 'completed' || status === 'failed') return false;
        return 3000;
      },
    }),

  /** `enabled`: wait until the page size is measured, or the first page is fetched twice. */
  byPipeline: (
    pipelineId: string,
    pagination: PaginationParams,
    options: { enabled?: boolean; filter?: JobFilter } = {},
  ) =>
    queryOptions<PaginatedList<JobEntity>>({
      queryKey: [...JOBS_QUERY_KEY(pipelineId), pagination, options.filter ?? null],
      enabled: (options.enabled ?? true) && !!pipelineId,
      queryFn: () => repository().getByPipelineId(pipelineId, pagination, options.filter),
      placeholderData: (previous, previousQuery) =>
        previous?.items[0]?.pipelineId === pipelineId &&
        JSON.stringify(previousQuery?.queryKey.at(-1)) === JSON.stringify(options.filter ?? null)
          ? previous
          : undefined,
      staleTime: 0,
      // The first page polls always: a job that starts elsewhere shows at its top. Other pages
      // poll only while a job runs, so no row moves under the user.
      refetchInterval: query =>
        pagination.page <= 1 || hasActive(query.state.data?.items ?? []) ? 5000 : false,
    }),

  /** Polls while a job of the window is running. */
  byWorkspace: (workspaceId: string | null, enabled = true) =>
    queryOptions({
      queryKey: WORKSPACE_JOBS_QUERY_KEY(workspaceId, WORKSPACE_JOBS_WINDOW),
      enabled: enabled && !!workspaceId,
      queryFn: () => repository().getByWorkspaceId(workspaceId!, WORKSPACE_JOBS_WINDOW),
      staleTime: 10_000,
      refetchInterval: query => (hasActive(query.state.data?.items ?? []) ? 5_000 : false),
    }),

  /** The figures of the jobs of a period, with its buckets. One minute between two reads. */
  stats: (
    workspaceId: string | null,
    period: PeriodScope<Pick<JobStatsQuery, 'from' | 'to' | 'bucket'>>,
    shape: Omit<JobStatsShape, 'bucket'> = {},
    enabled = true,
  ) =>
    queryOptions<JobStats>({
      queryKey: JOB_STATS_QUERY_KEY(workspaceId, period.scope, shape),
      enabled: enabled && !!workspaceId,
      queryFn: () =>
        repository().getStats({ workspaceId: workspaceId!, ...shape, ...period.range() }),
      staleTime: STATS_REFRESH_MS / 2,
      refetchInterval: STATS_REFRESH_MS,
    }),

  /**
   * One page of the newest jobs of the workspace, with no node. With no period, all the jobs.
   * `refetchMs` is the time between two reads.
   */
  newest: (
    workspaceId: string | null,
    shape: NewestJobsShape,
    options: {
      period?: PeriodScope<{ from: Date; to: Date | null }>;
      refetchMs?: number;
      enabled?: boolean;
    } = {},
  ) =>
    queryOptions<JobEntity[]>({
      queryKey: NEWEST_JOBS_QUERY_KEY(workspaceId, options.period?.scope ?? [], shape),
      enabled: (options.enabled ?? true) && !!workspaceId,
      queryFn: () => {
        const range = options.period?.range();
        return repository().getNewestByWorkspaceId({
          workspaceId: workspaceId!,
          ...shape,
          ...(range && { createdAfter: range.from }),
          ...(range?.to && { createdBefore: range.to }),
        });
      },
      staleTime: 0,
      refetchInterval: options.refetchMs ?? false,
    }),

  historyOf: (pipelineId: string, enabled: boolean) =>
    queryOptions({
      queryKey: JOBS_QUERY_KEY(pipelineId),
      enabled,
      queryFn: async () => {
        const list = await repository().getByPipelineId(pipelineId, {
          page: 1,
          pageSize: MAX_JOBS_PER_PIPELINE,
        });
        return { pipelineId, jobs: list.items, totalCount: list.pagination.totalCount };
      },
      staleTime: 0,
      refetchInterval: query => (hasActive(query.state.data?.jobs ?? []) ? 2000 : false),
    }),
};

/** The window, its outcome mix, and whether it is partial. */
export const asJobFeed = (data: PaginatedList<JobEntity> | undefined) => {
  const jobs = data?.items ?? [];
  const totalCount = data?.pagination.totalCount ?? 0;

  return {
    jobs,
    summary: summarizeJobs(jobs),
    totalCount,
    isPartialWindow: totalCount > jobs.length,
  };
};

/** The answer of an approval is the job after it: no read is needed to show it. */
const decided = (pipelineId: string, job: JobEntity) => {
  getQueryClient().setQueryData(JOB_QUERY_KEY(job.id), job);
  void getQueryClient().invalidateQueries({ queryKey: JOBS_QUERY_KEY(pipelineId) });
};

export const jobMutations = {
  /** Invalidates the pipeline's list, or every job list when the pipeline is not known. */
  remove: (pipelineId?: string) =>
    mutationOptions({
      mutationFn: (jobId: string) => repository().deleteById(jobId),
      onSuccess: () => {
        void getQueryClient().invalidateQueries({
          queryKey: pipelineId ? JOBS_QUERY_KEY(pipelineId) : JOBS_QUERY_ROOT,
        });
      },
    }),

  /** Stops a pending or running job; the list reads it again. */
  cancel: (pipelineId: string) =>
    mutationOptions({
      mutationFn: (jobId: string) => repository().cancel(jobId),
      onSuccess: () => {
        void getQueryClient().invalidateQueries({ queryKey: JOBS_QUERY_KEY(pipelineId) });
      },
    }),

  /** Runs a job from a fork that waits. The page shows the answer, and the list reads it again. */
  approve: (pipelineId: string) =>
    mutationOptions({
      mutationFn: (jobId: string) => repository().approve(jobId),
      onSuccess: (job: JobEntity) => decided(pipelineId, job),
    }),

  /** Cancels a job from a fork that waits. */
  reject: (pipelineId: string) =>
    mutationOptions({
      mutationFn: (jobId: string) => repository().reject(jobId),
      onSuccess: (job: JobEntity) => decided(pipelineId, job),
    }),

  rerun: (pipelineId: string) =>
    mutationOptions({
      mutationFn: (jobId: string) => repository().rerun(jobId),
      onSuccess: (newJobId: string) => {
        void getQueryClient().invalidateQueries({ queryKey: JOBS_QUERY_KEY(pipelineId) });
        scyllaNavigate.goToJobDetails(pipelineId, newJobId);
      },
    }),
};
