import { addDays, dayIn, daysBetween, startOfDayIn, type Day } from './zoned-day.presenter.ts';

export type PresetPeriodKind = '24h' | '7d' | '14d' | '30d';

/** The time window of the dashboard. A custom period holds whole days of the workspace zone. */
export type DashboardPeriod = { kind: PresetPeriodKind } | { kind: 'custom'; from: Day; to: Day };

export type PeriodKind = DashboardPeriod['kind'];

/** The size of a bucket of a chart, as `JobStatsBucket` of the server. */
export type PeriodBucket = 'hour' | 'day' | 'week';

/** `to: null` is now: the server reads an empty end as the time of the call. */
export interface PeriodRange {
  from: Date;
  to: Date | null;
  bucket: PeriodBucket;
}

export type CustomPeriodIssue = 'incomplete' | 'start-after-end' | 'end-in-future' | 'too-long';

export const PERIOD_KINDS: readonly PeriodKind[] = ['24h', '7d', '14d', '30d', 'custom'];

export const DEFAULT_PERIOD: DashboardPeriod = { kind: '14d' };

/** A custom period holds one year at most. */
export const MAX_CUSTOM_DAYS = 366;

const MAX_DAY_BUCKETS = 92;

const PRESET_DAYS: Readonly<Record<Exclude<PresetPeriodKind, '24h'>, number>> = {
  '7d': 7,
  '14d': 14,
  '30d': 30,
};

const HOUR_MS = 60 * 60 * 1000;

const bucketOfDays = (days: number): PeriodBucket =>
  days <= 1 ? 'hour' : days > MAX_DAY_BUCKETS ? 'week' : 'day';

/**
 * The instants that a period covers at `now`. `24h` is the last 24 hours, by hour. `7d`, `14d`
 * and `30d` are whole days of the zone, today included. A custom period ends at the end of its
 * last day, or now when its last day is today.
 */
export const periodRange = (period: DashboardPeriod, now: Date, timeZone: string): PeriodRange => {
  if (period.kind === '24h') {
    return { from: new Date(now.getTime() - 24 * HOUR_MS), to: null, bucket: 'hour' };
  }
  const today = dayIn(now, timeZone);
  if (period.kind === 'custom') {
    return {
      from: startOfDayIn(period.from, timeZone),
      to: period.to >= today ? null : startOfDayIn(addDays(period.to, 1), timeZone),
      bucket: bucketOfDays(daysBetween(period.from, period.to)),
    };
  }
  const days = PRESET_DAYS[period.kind];
  return {
    from: startOfDayIn(addDays(today, 1 - days), timeZone),
    to: null,
    bucket: bucketOfDays(days),
  };
};

/** The custom period that has the days of `period`, so that a switch to custom shows the same data. */
export const customPeriodFrom = (period: DashboardPeriod, today: Day): DashboardPeriod => {
  if (period.kind === 'custom') return period;
  const days = period.kind === '24h' ? 1 : PRESET_DAYS[period.kind];
  return { kind: 'custom', from: addDays(today, 1 - days), to: today };
};

export const customPeriodIssue = (from: Day, to: Day, today: Day): CustomPeriodIssue | null => {
  if (!from || !to) return 'incomplete';
  if (from > to) return 'start-after-end';
  if (to > today) return 'end-in-future';
  if (daysBetween(from, to) > MAX_CUSTOM_DAYS) return 'too-long';
  return null;
};
