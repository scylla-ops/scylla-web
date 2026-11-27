import type { ChartTone } from '@scylla/ui';
import { isFinishedStatus, type JobEntity, type JobStatus } from '@base/features/jobs';
import type { PipelineSummary } from '@base/features/pipeline';
import { shortJobId, statusTone } from '@base/features/dashboard/presentation/presenters/job-figures.presenter.ts';

type NodeState = JobEntity['nodeExecutions'][number]['state'];

export interface StageChip {
  id: string;
  tone: ChartTone;
}

export interface LastRun {
  id: string;
  shortId: string;
  status: JobStatus;
  at: string;
  branch: string;
}

const NODE_TONES: Readonly<Record<NodeState, ChartTone>> = {
  pending: 'queued',
  running: 'running',
  completed: 'passed',
  failed: 'failed',
  cancelled: 'canceled',
  skipped: 'skipped',
  unknown: 'muted',
};

export const stageChips = (job: JobEntity | undefined): StageChip[] =>
  (job?.nodeExecutions ?? []).map(node => ({ id: node.id, tone: NODE_TONES[node.state] }));

export const lastRunOf = (summary: PipelineSummary): LastRun | null => {
  const run = summary.recent.find(item => isFinishedStatus(item.status));
  if (!run) return null;
  return {
    id: run.id,
    shortId: shortJobId(run.id),
    status: run.status,
    at: run.finishedAt ?? run.createdAt,
    branch: run.branch,
  };
};

/**
 * The newest job in the live state of the pipeline (it runs or waits), with the time it started,
 * or was created if it waits. `null` when no job runs or waits, or the recent jobs do not hold it.
 */
export const liveRunOf = (summary: PipelineSummary): LastRun | null => {
  const run = summary.live ? summary.recent.find(item => item.status === summary.live) : undefined;
  if (!run) return null;
  return {
    id: run.id,
    shortId: shortJobId(run.id),
    status: run.status,
    at: run.startedAt ?? run.createdAt,
    branch: run.branch,
  };
};

/** The color of the pipeline: the state of its jobs that run or wait, else the end of its last run. */
export const pipelineTone = (summary: PipelineSummary): ChartTone => {
  if (summary.live) return statusTone(summary.live);
  const last = lastRunOf(summary);
  return last ? statusTone(last.status) : 'muted';
};

const TONE_TEXT: Readonly<Partial<Record<ChartTone, string>>> = {
  passed: 'text-status-passed',
  failed: 'text-status-failed',
  running: 'text-status-running',
  queued: 'text-status-queued',
  canceled: 'text-status-canceled',
};

/** The text color of the icon of a pipeline in this tone. */
export const toneTextClass = (tone: ChartTone): string =>
  TONE_TEXT[tone] ?? 'text-muted-foreground';
