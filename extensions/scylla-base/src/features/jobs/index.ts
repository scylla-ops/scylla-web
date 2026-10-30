/** `loadJobsPage` is a loader: `pipeline` renders this page behind its own route. */
export type { JobEntity, JobLog, JobLogStream } from './domain/entities/job.entity.ts';
export type { JobStatus } from '@shared/domain/structs/job-status.struct.ts';
export { isActiveStatus, isFinishedStatus } from '@shared/domain/structs/job-status.struct.ts';
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
