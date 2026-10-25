/** `loadJobsPage` is a loader: `pipeline` renders this page behind its own route. */
export type { JobEntity } from './domain/entities/job.entity.ts';
export type { JobLog, JobLogStream } from './domain/structs/job.struct.ts';
export type { JobStatus } from './domain/structs/job-status.struct.ts';
export { isActiveStatus, isFinishedStatus } from './domain/structs/job-status.struct.ts';
export type { JobsSummary } from './presentation/presenters/jobs-summary.presenter.ts';
export { summarizeJobs } from './presentation/presenters/jobs-summary.presenter.ts';
export {
  JOBS_QUERY_KEY,
  ORGANIZATION_JOBS_QUERY_KEY,
  JOBS_QUERY_ROOT,
} from './presentation/jobs.query-keys.ts';
export { jobQueries, asJobFeed, ORGANIZATION_JOBS_WINDOW } from './presentation/jobs.queries.ts';
export { jobsByPipelinesQueries } from './presentation/jobs-by-pipelines.queries.ts';

export const loadJobsPage = () => import('./presentation/ui/Jobs.page.svelte');
