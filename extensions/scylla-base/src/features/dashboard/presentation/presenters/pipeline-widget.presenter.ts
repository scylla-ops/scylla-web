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

export const pipelineTone = (summary: PipelineSummary): ChartTone => {
  if (summary.active) return 'running';
  const last = lastRunOf(summary);
  return last ? statusTone(last.status) : 'muted';
};
