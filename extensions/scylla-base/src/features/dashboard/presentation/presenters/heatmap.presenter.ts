import type { JobBucket } from '@base/features/jobs';
import {
  periodRange,
  type DashboardPeriod,
  type PeriodRange,
} from '@base/features/dashboard/presentation/presenters/period.presenter.ts';
import {
  addDays,
  clockIn,
  dayIn,
  daysBetween,
  startOfDayIn,
} from '@base/features/dashboard/presentation/presenters/zoned-day.presenter.ts';

export const HEATMAP_MIN_DAYS = 7;
/** `GetJobStats` gives 1000 buckets at most: 41 days of hours, with a change of the clock. */
export const HEATMAP_MAX_DAYS = 41;

export type HeatLevel = 0 | 1 | 2 | 3 | 4;

export type WeekGrid = number[][];

export interface HeatmapRange extends PeriodRange {
  days: number;
}

const HOURS = 24;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The hours that the heatmap counts: the days of the period, at least the last 7 and at most
 * the last 41, by hour.
 */
export const heatmapRange = (period: DashboardPeriod, now: Date, timeZone: string): HeatmapRange => {
  const range = periodRange(period, now, timeZone);
  const last = dayIn(range.to ? new Date(range.to.getTime() - 1) : now, timeZone);
  const first = dayIn(range.from, timeZone);
  const days = Math.min(HEATMAP_MAX_DAYS, Math.max(HEATMAP_MIN_DAYS, daysBetween(first, last)));
  return {
    from: startOfDayIn(addDays(last, 1 - days), timeZone),
    to: range.to,
    bucket: 'hour',
    days,
  };
};

const weekdayOf = (day: string): number => (new Date(`${day}T00:00:00.000Z`).getUTCDay() + 6) % 7;

export const weekGrid = (
  buckets: readonly JobBucket[],
  timeZone: string,
  valueOf: (bucket: JobBucket) => number,
): WeekGrid => {
  const grid = Array.from({ length: 7 }, () => Array<number>(HOURS).fill(0));
  for (const bucket of buckets) {
    const start = new Date(bucket.start);
    const hour = Number(clockIn(start, timeZone).slice(0, 2));
    grid[weekdayOf(dayIn(start, timeZone))][hour] += valueOf(bucket);
  }
  return grid;
};

export const pairHours = (grid: WeekGrid): WeekGrid =>
  grid.map(row => Array.from({ length: row.length / 2 }, (_, index) => row[index * 2] + row[index * 2 + 1]));

export const heatLevels = (grid: WeekGrid): HeatLevel[][] => {
  const top = Math.max(0, ...grid.flat());
  return grid.map(row =>
    row.map(value => (value <= 0 || top === 0 ? 0 : (Math.min(4, Math.ceil((value / top) * 4)) as HeatLevel))),
  );
};

export const busiestCell = (grid: WeekGrid): { weekday: number; hour: number; count: number } | null => {
  let best: { weekday: number; hour: number; count: number } | null = null;
  for (const [weekday, row] of grid.entries()) {
    for (const [hour, count] of row.entries()) {
      if (count > 0 && (!best || count > best.count)) best = { weekday, hour, count };
    }
  }
  return best;
};

export const weekdayNames = (locale: string, style: 'short' | 'narrow'): string[] => {
  const format = new Intl.DateTimeFormat(locale, { weekday: style, timeZone: 'UTC' });
  const monday = Date.UTC(2024, 0, 1);
  return Array.from({ length: 7 }, (_, index) => format.format(new Date(monday + index * DAY_MS)));
};
