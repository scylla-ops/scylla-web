import type { ChartTone } from '@scylla/ui';
import { formatNumber, t } from '@scylla/ui/i18n';
import type { JobRun } from '@shared/presentation/presenters/job-run.presenter.ts';
import { formatUtcDay } from '@shared/utils/date-utils.ts';
import { isFinishedStatus, type JobEntity, type JobStatus } from '@base/features/jobs';
import {
  recentSuccessRate,
  type PipelineSummary,
  type PipelineTriggerKind,
} from '@base/features/pipeline';
import { widgetMessages } from '@base/features/dashboard/presentation/messages/widgets.messages.ts';
import {
  durationText,
  rateText,
  shortJobId,
  statusTone,
} from '@base/features/dashboard/presentation/presenters/job-figures.presenter.ts';
import { clockIn, dayIn } from '@base/features/dashboard/presentation/presenters/zoned-day.presenter.ts';

/** Where a job is: the names that a row shows, and the ids that open it. */
export interface JobPlace {
  jobId: string;
  shortId: string;
  pipelineId: string;
  pipelineName: string;
  projectId: string;
  projectName: string;
}

export interface RunningRow extends JobPlace {
  elapsed: string;
  /** The median of the pipeline. `null` when the pipeline has no median yet: no bar. */
  expected: string | null;
  /** From 0 to 1, against the median. */
  progress: number | null;
  /** "2× the median", when the job runs longer than the median. */
  overrun: string | null;
  agentId?: string;
  /** The node that runs now. */
  step?: string;
  attempt?: number;
  maxAttempts?: number;
}

export interface WaitingRow extends JobPlace {
  reason: 'agent' | 'approval';
  waited: string;
}

export type AttentionKind = 'failed' | 'orphaned' | 'approval';

export interface AttentionItem extends JobPlace {
  kind: AttentionKind;
  /** The end of the job, or its creation for an approval. */
  at: string;
}

export interface ActivityRow extends JobPlace {
  status: JobStatus;
  tone: ChartTone;
  /** The time in the zone for a job of today, else the day. */
  when: string;
}

export interface RunMark extends JobPlace {
  tone: ChartTone;
  run: JobRun;
  seconds: number | null;
}

/** One run of the strip of a pipeline. */
export interface StripRun extends RunMark {
  status: JobStatus;
  branch: string;
  duration: string;
  when: string;
}

const runSeconds = (run: { startedAt?: string; finishedAt?: string }): number | null =>
  run.startedAt && run.finishedAt
    ? Math.max(0, (Date.parse(run.finishedAt) - Date.parse(run.startedAt)) / 1000)
    : null;

export const runMark = (
  job: Omit<JobRun, 'ref' | 'title'>,
  pipeline: { id: string; name: string; projectId: string; projectName: string },
  ref = '',
): RunMark => ({
  jobId: job.id,
  shortId: shortJobId(job.id),
  pipelineId: pipeline.id,
  pipelineName: pipeline.name,
  projectId: pipeline.projectId,
  projectName: pipeline.projectName,
  tone: statusTone(job.status),
  run: {
    id: job.id,
    status: job.status,
    ref: ref || undefined,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
  },
  seconds: runSeconds(job),
});

export interface PipelineRow {
  id: string;
  projectId: string;
  name: string;
  projectName: string;
  /** Green, red, or running when a job runs now. */
  tone: ChartTone;
  trigger: string;
  /** The last runs, oldest first: the newest is at the right. */
  strip: ChartTone[];
  /** The same runs as `strip`, with what a tooltip shows. */
  runs: StripRun[];
  rate: string;
  median: string;
}

const TRIGGERS: Readonly<Record<PipelineTriggerKind, () => string>> = {
  push: () => t(widgetMessages.triggerPush),
  pull_request: () => t(widgetMessages.triggerPullRequest),
  cron: () => t(widgetMessages.triggerCron),
  webhook: () => t(widgetMessages.triggerWebhook),
};

const placeOf = (
  job: { id: string; pipelineId: string },
  pipelines: ReadonlyMap<string, PipelineSummary>,
): JobPlace => {
  const pipeline = pipelines.get(job.pipelineId);
  return {
    jobId: job.id,
    shortId: shortJobId(job.id),
    pipelineId: job.pipelineId,
    pipelineName: pipeline?.name ?? shortJobId(job.pipelineId),
    projectId: pipeline?.projectId ?? '',
    projectName: pipeline?.projectName ?? '',
  };
};

const secondsBetween = (from: string, now: number): number =>
  Math.max(0, Math.round((now - Date.parse(from)) / 1000));

/** "2", "1.5", "1,5" in French. */
const factorText = (factor: number): string => formatNumber(factor, { maximumFractionDigits: 1 });

/** The summaries by the id of their pipeline. */
export const pipelinesById = (
  summaries: readonly PipelineSummary[],
): ReadonlyMap<string, PipelineSummary> =>
  new Map(summaries.map(summary => [summary.id, summary]));

/**
 * The jobs that run, with their time against the median of their pipeline, and the jobs that
 * wait for an agent or an approval, the longest wait first.
 */
export const liveJobs = (
  jobs: readonly JobEntity[],
  pipelines: ReadonlyMap<string, PipelineSummary>,
  now: number,
): { running: RunningRow[]; waiting: WaitingRow[] } => {
  const running = jobs
    .filter(job => job.status === 'running')
    .map((job): RunningRow => {
      const elapsed = secondsBetween(job.startedAt ?? job.createdAt, now);
      const median = pipelines.get(job.pipelineId)?.medianDuration ?? null;
      const factor = median ? elapsed / median : null;
      const node = job.nodeExecutions.find(item => item.state === 'running') ?? job.nodeExecutions.at(-1);
      return {
        ...placeOf(job, pipelines),
        agentId: job.agentId,
        step: node?.id,
        attempt: node?.attempts,
        maxAttempts: node?.maxAttempts,
        elapsed: durationText(elapsed),
        expected: median === null ? null : durationText(median),
        progress: factor === null ? null : Math.min(1, factor),
        overrun:
          factor !== null && factor > 1
            ? t(widgetMessages.timesTheMedian(factorText(factor)))
            : null,
      };
    });
  const waiting = jobs
    .filter(job => job.status === 'pending' || job.status === 'awaiting_approval')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map(
      (job): WaitingRow => ({
        ...placeOf(job, pipelines),
        reason: job.status === 'awaiting_approval' ? 'approval' : 'agent',
        waited: durationText(secondsBetween(job.createdAt, now)),
      }),
    );
  return { running, waiting };
};

/**
 * What needs the user now: each red pipeline whose last ended job failed or was orphaned, and
 * each job that waits for an approval. Newest first. An item goes away when its problem is fixed.
 */
export const attentionItems = (
  summaries: readonly PipelineSummary[],
  jobs: readonly JobEntity[],
): AttentionItem[] => {
  const pipelines = pipelinesById(summaries);
  const red = summaries.flatMap((summary): AttentionItem[] => {
    if (summary.health !== 'red') return [];
    const last = summary.recent.find(run => isFinishedStatus(run.status));
    if (!last || (last.status !== 'failed' && last.status !== 'orphaned')) return [];
    return [
      {
        ...placeOf({ id: last.id, pipelineId: summary.id }, pipelines),
        kind: last.status,
        at: last.finishedAt ?? last.createdAt,
      },
    ];
  });
  const approvals = jobs
    .filter(job => job.status === 'awaiting_approval')
    .map(
      (job): AttentionItem => ({ ...placeOf(job, pipelines), kind: 'approval', at: job.createdAt }),
    );
  return [...red, ...approvals].sort((a, b) => b.at.localeCompare(a.at));
};

/** The number of items of each kind, in the order of the design. */
export const attentionCounts = (
  items: readonly AttentionItem[],
): { kind: AttentionKind; count: number }[] =>
  (['failed', 'orphaned', 'approval'] as const)
    .map(kind => ({ kind, count: items.filter(item => item.kind === kind).length }))
    .filter(entry => entry.count > 0);

/** The time of the day for an instant of today in the zone, else its day. */
export const whenText = (instant: string, now: Date, timeZone: string): string => {
  const at = new Date(instant);
  const day = dayIn(at, timeZone);
  return day === dayIn(now, timeZone) ? clockIn(at, timeZone) : formatUtcDay(day);
};

/** The ends of jobs, newest first. */
export const activityRows = (
  jobs: readonly JobEntity[],
  pipelines: ReadonlyMap<string, PipelineSummary>,
  now: Date,
  timeZone: string,
): ActivityRow[] =>
  jobs
    .filter(job => isFinishedStatus(job.status))
    .map(job => ({
      ...placeOf(job, pipelines),
      status: job.status,
      tone: statusTone(job.status),
      when: whenText(job.finishedAt ?? job.createdAt, now, timeZone),
    }));

/** A row for each pipeline, in the order of the server. */
export const pipelineRows = (
  summaries: readonly PipelineSummary[],
  runs: number,
  timeZone = 'UTC',
  now: Date = new Date(),
): PipelineRow[] =>
  summaries.map(summary => ({
    id: summary.id,
    projectId: summary.projectId,
    name: summary.name,
    projectName: summary.projectName,
    tone: summary.active
      ? 'running'
      : summary.health === 'green'
        ? 'passed'
        : summary.health === 'red'
          ? 'failed'
          : 'muted',
    trigger: summary.triggerKinds.length
      ? TRIGGERS[summary.triggerKinds[0]]()
      : t(widgetMessages.triggerManual),
    strip: summary.recent
      .slice(0, runs)
      .reverse()
      .map(run => statusTone(run.status)),
    runs: summary.recent
      .slice(0, runs)
      .reverse()
      .map(run => ({
        ...runMark(run, summary, run.branch),
        status: run.status,
        branch: run.branch,
        duration: durationText(runSeconds(run)),
        when: run.createdAt ? whenText(run.createdAt, now, timeZone) : '—',
      })),
    rate: rateText(recentSuccessRate(summary)),
    median: durationText(summary.medianDuration),
  }));
