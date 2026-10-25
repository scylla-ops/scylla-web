import type { JobEntity } from '@base/features/jobs/domain/entities/job.entity.ts';
import { isFinishedStatus } from '@base/features/jobs/domain/structs/job-status.struct.ts';

/** Over the fetched page only: the backend has no organization aggregate. Say so where it is shown (`isPartialWindow`). */
export interface JobsSummary {
  total: number;
  pending: number;
  running: number;
  completed: number;
  failed: number;
  cancelled: number;
  orphaned: number;
  finished: number;
  /** In `[0, 1]`. `null` when nothing has finished yet, which is not 0 %. */
  successRate: number | null;
  lastRunAt: string | null;
}

const EMPTY: JobsSummary = {
  total: 0,
  pending: 0,
  running: 0,
  completed: 0,
  failed: 0,
  cancelled: 0,
  orphaned: 0,
  finished: 0,
  successRate: null,
  lastRunAt: null,
};

/** Cancelled and orphaned runs count as failures. */
export const summarizeJobs = (jobs: readonly JobEntity[]): JobsSummary => {
  if (jobs.length === 0) return EMPTY;

  const summary = { ...EMPTY, total: jobs.length };
  let lastRunAt: string | null = null;

  for (const job of jobs) {
    switch (job.status) {
      case 'pending':
        summary.pending++;
        break;
      case 'running':
        summary.running++;
        break;
      case 'completed':
        summary.completed++;
        break;
      case 'failed':
        summary.failed++;
        break;
      case 'cancelled':
        summary.cancelled++;
        break;
      case 'orphaned':
        summary.orphaned++;
        break;
      // `unknown` counts only in `total`: guessing its bucket would skew the rate.
    }

    if (isFinishedStatus(job.status)) summary.finished++;
    if (lastRunAt === null || job.createdAt > lastRunAt) lastRunAt = job.createdAt;
  }

  return {
    ...summary,
    successRate: summary.finished === 0 ? null : summary.completed / summary.finished,
    lastRunAt,
  };
};
