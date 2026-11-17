import type { JobStatus } from '@shared/domain/structs/job-status.struct.ts';

/**
 * `green`: the last ended job of the default branch completed. `red`: it did not. `none`: the
 * pipeline has no ended job.
 */
export type PipelineHealth = 'green' | 'red' | 'none';

/** A kind of trigger that can start a job of the pipeline. */
export type PipelineTriggerKind = 'cron' | 'webhook' | 'push' | 'pull_request';

/** One of the last jobs of a pipeline. */
export interface RecentRun {
  id: string;
  status: JobStatus;
  /** Empty for a job of a tag or a job with no source. */
  branch: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
}

/** A pipeline with its last jobs and its health, as the server computes them for the dashboard. */
export interface PipelineSummary {
  id: string;
  name: string;
  projectId: string;
  projectName: string;
  /** Newest first. */
  recent: RecentRun[];
  /** The recent jobs that completed. */
  completed: number;
  /** The recent jobs that failed or were orphaned. */
  failed: number;
  /** In seconds, of the recent jobs that completed. `null` when none did. */
  medianDuration: number | null;
  health: PipelineHealth;
  /** A job runs, or waits for an agent or an approval. */
  active: boolean;
  triggerKinds: PipelineTriggerKind[];
  /** The next fire of a cron trigger. */
  nextFire: { at: string; schedule: string } | null;
}

/** One page of summaries, and the counts of all the pages. */
export interface PipelineSummaryList {
  items: PipelineSummary[];
  total: number;
  green: number;
}

/** `failing-first`: red, then no ended job, then green; the lowest success rate first. */
export type PipelineSummaryOrder = 'failing-first' | 'slowest' | 'name';

/** completed / (completed + failed) of the recent jobs. `null` when no recent job ended so. */
export const recentSuccessRate = (summary: Pick<PipelineSummary, 'completed' | 'failed'>) => {
  const ended = summary.completed + summary.failed;
  return ended === 0 ? null : summary.completed / ended;
};

/** The summaries of a workspace to read. */
export interface PipelineSummaryQuery {
  workspaceId: string;
  /** The recent jobs of each pipeline, at most 50. */
  runs: number;
  order: PipelineSummaryOrder;
  /** The first page only, at most 100 pipelines. */
  limit: number;
}
