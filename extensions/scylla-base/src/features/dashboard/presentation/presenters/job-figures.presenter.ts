import type { ChartDeltaDirection, ChartDeltaTone, ChartTone } from '@scylla/ui';
import { deltaTrend } from '@scylla/ui';
import { t } from '@scylla/ui/i18n';
import { formatDuration, formatUtcDay } from '@shared/utils/date-utils.ts';
import { decidedJobs, type JobBucket, type JobStatus } from '@base/features/jobs';
import { widgetMessages } from '@base/features/dashboard/presentation/messages/widgets.messages.ts';
import type {
  DashboardPeriod,
  PeriodBucket,
} from '@base/features/dashboard/presentation/presenters/period.presenter.ts';
import { customPeriodLabel } from '@base/features/dashboard/presentation/presenters/period-options.presenter.ts';
import { clockIn, dayIn } from '@base/features/dashboard/presentation/presenters/zoned-day.presenter.ts';

/** A change against the previous period, as `ChartDelta` shows it. */
export interface ChangeView {
  label: string;
  direction: ChartDeltaDirection;
  tone: ChartDeltaTone;
}

/** The parts of one bar, in percent of the highest bar. */
export interface OutcomeBar {
  start: string;
  completed: number;
  failed: number;
  orphaned: number;
}

/** The parts of one bar of the day bars, in percent of the highest bar. */
export interface DayBar {
  start: string;
  /** The bucket has no run: the bar shows its track only. */
  empty: boolean;
  completed: number;
  failed: number;
  /** The orphaned and the cancelled jobs. */
  other: number;
  /** The top of the parts. */
  top: number;
}

/** The median and the p95 of one bucket, in percent of the highest p95. */
export interface DurationBar {
  start: string;
  p50: number;
  p95: number;
}

const MINUS = '−';

const signed = (value: number, digits: number): string =>
  value === 0 ? (0).toFixed(digits) : `${value > 0 ? '+' : MINUS}${Math.abs(value).toFixed(digits)}`;

const STATUS_TONES: Readonly<Record<JobStatus, ChartTone>> = {
  completed: 'passed',
  failed: 'failed',
  orphaned: 'canceled',
  cancelled: 'canceled',
  running: 'running',
  pending: 'queued',
  awaiting_approval: 'queued',
  unknown: 'muted',
};

/** The color of a job of this status. */
export const statusTone = (status: JobStatus): ChartTone => STATUS_TONES[status];

/** The last 8 characters of the id of a job: the design shows a job so, in mono. */
export const shortJobId = (id: string): string => id.slice(-8);

/** "89%". `null` (no job counts) gives an em dash, not 0 %. */
export const rateText = (rate: number | null): string =>
  rate === null ? '—' : `${Math.round(rate * 100)}%`;

/** "+3.4 pts". A higher rate is good. */
export const rateChange = (points: number | null): ChangeView | null => {
  if (points === null) return null;
  const rounded = Math.round(points * 10) / 10;
  return {
    label: t(widgetMessages.pointsChange(signed(rounded, 1))),
    ...deltaTrend(rounded, 'up'),
  };
};

/** "3m 10s". `null` gives an em dash. */
export const durationText = (seconds: number | null): string =>
  seconds === null ? '—' : formatDuration(Math.round(seconds));

/** "−12 %": the change of a duration in percent. A shorter time is good. */
export const durationChange = (now: number | null, before: number | null): ChangeView | null => {
  if (now === null || before === null || before <= 0) return null;
  const percent = Math.round(((now - before) / before) * 100);
  return { label: `${signed(percent, 0)} %`, ...deltaTrend(percent, 'down') };
};

/** One stacked bar for each bucket. The highest bar fills the height. */
export const outcomeBars = (buckets: readonly JobBucket[]): OutcomeBar[] => {
  const highest = Math.max(1, ...buckets.map(bucket => decidedJobs(bucket.figures.outcomes)));
  return buckets.map(({ start, figures: { outcomes } }) => ({
    start,
    completed: (outcomes.completed / highest) * 100,
    failed: (outcomes.failed / highest) * 100,
    orphaned: (outcomes.orphaned / highest) * 100,
  }));
};

/** One stacked bar for each bucket, over a track of the full height. The highest bar fills the track. */
export const dayBars = (buckets: readonly JobBucket[]): DayBar[] => {
  const total = ({ completed, failed, orphaned, cancelled }: JobBucket['figures']['outcomes']) =>
    completed + failed + orphaned + cancelled;
  const highest = Math.max(1, ...buckets.map(bucket => total(bucket.figures.outcomes)));
  return buckets.map(({ start, figures: { outcomes } }) => ({
    start,
    empty: total(outcomes) === 0,
    completed: (outcomes.completed / highest) * 100,
    failed: (outcomes.failed / highest) * 100,
    other: ((outcomes.orphaned + outcomes.cancelled) / highest) * 100,
    top: (total(outcomes) / highest) * 100,
  }));
};

/** One bar for each bucket: the median, and a light top up to the p95. */
export const durationBars = (buckets: readonly JobBucket[]): DurationBar[] => {
  const top = (bucket: JobBucket) => bucket.figures.p95Duration ?? bucket.figures.p50Duration ?? 0;
  const highest = Math.max(0, ...buckets.map(top));
  return buckets.map(bucket => ({
    start: bucket.start,
    p50: highest ? ((bucket.figures.p50Duration ?? 0) / highest) * 100 : 0,
    p95: highest ? (top(bucket) / highest) * 100 : 0,
  }));
};

/** The time of a bucket in the zone: the clock for an hour, else the day. */
export const bucketLabel = (start: string, bucket: PeriodBucket, timeZone: string): string => {
  const instant = new Date(start);
  return bucket === 'hour' ? clockIn(instant, timeZone) : formatUtcDay(dayIn(instant, timeZone));
};

/**
 * The three labels under the bars: the first bucket, the middle one, the last one. The last one
 * is "today" (or "now" by hour) when the period ends now.
 */
export const bucketAxis = (
  buckets: readonly { start: string }[],
  bucket: PeriodBucket,
  timeZone: string,
  endsNow: boolean,
): [string, string, string] | null => {
  if (buckets.length < 2) return null;
  const label = (index: number) => bucketLabel(buckets[index].start, bucket, timeZone);
  const last = endsNow
    ? t(bucket === 'hour' ? widgetMessages.now : widgetMessages.today)
    : label(buckets.length - 1);
  return [label(0), label(Math.floor((buckets.length - 1) / 2)), last];
};

/** The period after the title of a widget: "24 hours", "14 days", "2 Nov – 15 Nov". */
export const periodMeta = (period: DashboardPeriod): string => {
  switch (period.kind) {
    case '24h':
      return t(widgetMessages.last24Hours);
    case '7d':
      return t(widgetMessages.lastDays(7));
    case '14d':
      return t(widgetMessages.lastDays(14));
    case '30d':
      return t(widgetMessages.lastDays(30));
    case 'custom':
      return customPeriodLabel(period.from, period.to);
  }
};
