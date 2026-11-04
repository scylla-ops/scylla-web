import type { PaginationParams } from '@scylla/ui/structs';

export const JOBS_QUERY_KEY = (pipelineId: string) => ['jobs', 'pipeline', pipelineId] as const;

/** Under the `'jobs'` root: invalidating it refreshes every scope. */
export const WORKSPACE_JOBS_QUERY_KEY = (
  workspaceId: string | null,
  pagination?: PaginationParams,
) => ['jobs', 'workspace', workspaceId, pagination] as const;

/** Under the `'jobs'` root too. */
export const JOB_QUERY_KEY = (jobId: string) => ['jobs', 'detail', jobId] as const;

export const JOBS_QUERY_ROOT = ['jobs'] as const;
