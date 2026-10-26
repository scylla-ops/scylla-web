import type { DailyOutcome } from '@base/features/agents/domain/entities/agent.entity.ts';

/** The window of `AgentStats.daily`. */
export const WINDOW_DAYS = 30;

export interface DayBucket {
  /** `YYYY-MM-DD`, local time. */
  day: string;
  completed: number;
  failed: number;
  cancelled: number;
  orphaned: number;
}

/** The user's day, not UTC's. */
export const localDay = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;

/** Zero-filled and oldest first: the backend sends only the days with a job. */
export const fillDays = (
  daily: readonly DailyOutcome[],
  days: number = WINDOW_DAYS,
  today: Date = new Date(),
): DayBucket[] => {
  const byDay = new Map(daily.map(outcome => [localDay(new Date(outcome.day)), outcome]));

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (days - 1 - index));
    const key = localDay(date);
    const hit = byDay.get(key);

    return {
      day: key,
      completed: hit?.completed ?? 0,
      failed: hit?.failed ?? 0,
      cancelled: hit?.cancelled ?? 0,
      orphaned: hit?.orphaned ?? 0,
    };
  });
};

export const bucketTotal = (bucket: DayBucket): number =>
  bucket.completed + bucket.failed + bucket.cancelled + bucket.orphaned;

/** An even top above the tallest day, so the middle gridline is a whole number of jobs. */
export const axisTop = (buckets: readonly DayBucket[]): number => {
  const peak = Math.max(0, ...buckets.map(bucketTotal));
  return Math.max(2, Math.ceil((peak + 1) / 2) * 2);
};

/** The local date of a `YYYY-MM-DD` key. */
export const dateOfDay = (day: string): Date => {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(year, month - 1, date);
};
