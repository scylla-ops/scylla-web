import type {
  JobEntity,
  JobNodeExecution,
} from '@base/features/jobs/domain/entities/job.entity.ts';
import { nodeIdOf } from './job-timeline.presenter.ts';
import { isCheckoutStep, stepsOf } from './job-steps.presenter.ts';

/** The place of a node on the timeline of the job, in percent of the time of the job. */
export interface TimelineBar {
  start: number;
  width: number;
}

/** A row of the list of the nodes of a job page. */
export interface JobNodeRow {
  id: string;
  /** The built-in checkout: its name is a text of the app. */
  builtIn: boolean;
  execution: JobNodeExecution;
  /** In seconds. `null` before the start. A running node counts until `now`. */
  duration: number | null;
  /** `null` for a node that did not start. */
  bar: TimelineBar | null;
}

const time = (iso: string | undefined): number | null => {
  if (!iso) return null;
  const value = Date.parse(iso);
  return Number.isNaN(value) ? null : value;
};

/**
 * The steps of the job (the checkout, then the nodes), each with its duration and its bar on the
 * timeline of the job: from the first start to the end of the job, or to `now` while it runs.
 */
export const jobNodeRows = (job: JobEntity, now: number): JobNodeRow[] => {
  const steps = stepsOf(job);
  const spans = steps.map(step => {
    const start = time(step.startedAt);
    return start === null ? null : { start, end: Math.max(start, time(step.finishedAt) ?? now) };
  });

  const starts = spans.flatMap(span => (span ? [span.start] : []));
  const ends = spans.flatMap(span => (span ? [span.end] : []));
  const jobStart = Math.min(time(job.startedAt) ?? Infinity, ...starts);
  const jobEnd = Math.max(time(job.finishedAt) ?? (starts.length ? now : -Infinity), ...ends);
  const total = jobEnd - jobStart;

  return steps.map((execution, index) => {
    const id = nodeIdOf(execution, index);
    const span = spans[index];
    const bar =
      span && Number.isFinite(total) && total > 0
        ? {
            start: ((span.start - jobStart) / total) * 100,
            width: ((span.end - span.start) / total) * 100,
          }
        : span
          ? { start: 0, width: 100 }
          : null;
    return {
      id,
      builtIn: isCheckoutStep(id),
      execution,
      duration: span ? Math.floor((span.end - span.start) / 1000) : null,
      bar,
    };
  });
};
