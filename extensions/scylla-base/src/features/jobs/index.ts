/** `loadJobsPage` is a loader: `pipeline` renders this page behind its own route. */
export type {
  JobEntity,
  JobEvent,
  JobFilter,
  JobLog,
  JobLogStream,
  NewestJobsQuery,
} from './domain/entities/job.entity.ts';
export type {
  JobBucket,
  JobFigures,
  JobGroup,
  JobOutcomes,
  JobStats,
  JobStatsBucketSize,
  JobStatsGroupBy,
  JobStatsOrder,
  JobStatsQuery,
} from './domain/structs/job-stats.struct.ts';
export {
  decidedJobs,
  successRate,
  successRateChange,
} from './domain/structs/job-stats.struct.ts';
export type { JobStatus } from '@shared/domain/structs/job-status.struct.ts';
export { isActiveStatus, isFinishedStatus } from '@shared/domain/structs/job-status.struct.ts';
export type { JobsSummary } from './presentation/presenters/jobs-summary.presenter.ts';
export { summarizeJobs } from './presentation/presenters/jobs-summary.presenter.ts';
export {
  JOBS_QUERY_KEY,
  WORKSPACE_JOBS_QUERY_KEY,
  JOBS_QUERY_ROOT,
} from './presentation/jobs.query-keys.ts';
export {
  jobQueries,
  jobMutations,
  asJobFeed,
  WORKSPACE_JOBS_WINDOW,
  type JobStatsShape,
  type NewestJobsShape,
  type PeriodScope,
} from './presentation/jobs.queries.ts';
export {
  jobsByPipelinesQueries,
  type PipelineHistory,
} from './presentation/jobs-by-pipelines.queries.ts';

export const loadJobsPage = () => import('./presentation/ui/Jobs.page.svelte');
