import type { StatusState } from '@scylla/ui';
import { t } from '@scylla/ui/i18n';
import type { JobEntity } from '@base/features/jobs';
import { isActiveStatus } from '@shared/domain/structs/job-status.struct.ts';
import { formatDuration } from '@shared/utils/date-utils.ts';
import { toStatusState } from '@shared/utils/job-status.utils.ts';
import { pipelineMessages } from '../messages/pipeline.messages.ts';

/** The most bars of a row: the jobs that the list loads for each pipeline. */
export const MAX_BARS = 30;

const BAR_WIDTH = 20;
const BAR_GAP = 4;
/** A job of the median duration. */
const MEDIAN_BAR_HEIGHT = 40;
const MIN_BAR_HEIGHT = 8;
const MAX_BAR_HEIGHT = 48;

/** The solid color of the status, as `StatusShape` draws it. A running job breathes. */
const BAR_CLASS: Record<StatusState, string> = {
  success: 'bg-status-passed',
  failed: 'bg-status-failed',
  running: 'bg-status-running animate-[smooth-pulse_2s_infinite]',
  pending: 'bg-status-queued',
  idle: 'bg-status-queued',
  skipped: 'bg-status-skipped',
  cancelled: 'bg-status-canceled',
  orphaned: 'bg-status-canceled',
};

export interface HistoryBar {
  job: JobEntity;
  state: StatusState;
  /** In seconds. `null` before the start. */
  duration: number | null;
  /** In px. */
  height: number;
  className: string;
}

export interface HistoryStats {
  /** The jobs that the row shows. */
  count: number;
  /** completed / (completed + failed): a cancelled job does not count. `null` with neither. */
  passRate: number | null;
  /** Of the completed jobs, in seconds. */
  medianDuration: number | null;
  /** The failed and the orphaned jobs. */
  failures: number;
  lastFailure: JobEntity | null;
}

/** How many bars of 20 px, 4 px apart, a row of this width holds. */
export const barCapacity = (width: number): number =>
  Math.min(MAX_BARS, Math.max(0, Math.floor((width + BAR_GAP) / (BAR_WIDTH + BAR_GAP))));

/** The last 8 characters: the start of an id made from the time is the same for all jobs. */
export const shortId = (id: string): string => id.slice(-8);

/** From the start to the end, or to `now` while the job is active. */
export const jobDuration = (job: JobEntity, now: number): number | null => {
  if (!job.startedAt) return null;
  const end = job.finishedAt
    ? Date.parse(job.finishedAt)
    : isActiveStatus(job.status)
      ? now
      : Date.parse(job.updatedAt);
  return Math.max(0, Math.floor((end - Date.parse(job.startedAt)) / 1000));
};

const median = (values: number[]): number | null => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

const medianDuration = (jobs: JobEntity[], now: number): number | null =>
  median(
    jobs
      .filter(job => job.status === 'completed')
      .map(job => jobDuration(job, now))
      .filter(duration => duration !== null),
  );

/** 40 px for the median duration, from 8 to 48 px. */
export const barHeight = (duration: number | null, medianSeconds: number | null): number => {
  if (duration === null) return MIN_BAR_HEIGHT;
  if (!medianSeconds) return MEDIAN_BAR_HEIGHT;
  const height = Math.round((MEDIAN_BAR_HEIGHT * duration) / medianSeconds);
  return Math.min(MAX_BAR_HEIGHT, Math.max(MIN_BAR_HEIGHT, height));
};

/** The bars of the `count` newest jobs (`jobs` is newest first), the oldest on the left. */
export const historyBars = (jobs: JobEntity[], count: number, now: number): HistoryBar[] => {
  const shown = jobs.slice(0, count);
  const medianSeconds = medianDuration(shown, now);
  return shown
    .map(job => {
      const state = toStatusState(job.status);
      const duration = jobDuration(job, now);
      return {
        job,
        state,
        duration,
        height: barHeight(duration, medianSeconds),
        className: BAR_CLASS[state],
      };
    })
    .reverse();
};

const isFailure = (job: JobEntity) => job.status === 'failed' || job.status === 'orphaned';

/** The figures of the `count` newest jobs: the jobs of the bars. */
export const historyStats = (jobs: JobEntity[], count: number, now: number): HistoryStats => {
  const shown = jobs.slice(0, count);
  const failed = shown.filter(isFailure);
  const completed = shown.filter(job => job.status === 'completed').length;
  const judged = completed + failed.length;
  return {
    count: shown.length,
    passRate: judged === 0 ? null : completed / judged,
    medianDuration: medianDuration(shown, now),
    failures: failed.length,
    lastFailure: failed[0] ?? null,
  };
};

/** The three figures of the stats card. `-` for a figure with no job to count. */
export const historyFigures = (stats: HistoryStats): { label: string; value: string }[] => [
  {
    label: t(pipelineMessages.passed),
    value: stats.passRate === null ? '-' : `${Math.round(stats.passRate * 100)}%`,
  },
  {
    label: t(pipelineMessages.median),
    value: stats.medianDuration === null ? '-' : formatDuration(Math.round(stats.medianDuration)),
  },
  { label: t(pipelineMessages.failed), value: String(stats.failures) },
];
