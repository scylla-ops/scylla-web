import type { AppJob } from '../entities/app.entity.ts';

/** What an agent did, from its jobs. */
export interface AppStats {
  total: number;
  running: number;
  completed: number;
  failed: number;
  cancelled: number;
  orphaned: number;
  /** Empty when no job ran. */
  lastRunAt: string;
  /** `null`: no job finished yet (not a 0 ms run). */
  medianDurationMs: number | null;
  p95DurationMs: number | null;
  /** The jobs that ended, by day (UTC), oldest first; a day with none is absent. */
  daily: DailyOutcome[];
}

export interface DailyOutcome {
  /** `YYYY-MM-DD`. */
  day: string;
  completed: number;
  failed: number;
  cancelled: number;
  orphaned: number;
}

const ENDED = ['completed', 'failed', 'cancelled', 'orphaned'] as const;
type Ended = (typeof ENDED)[number];
const isEnded = (status: AppJob['status']): status is Ended =>
  (ENDED as readonly string[]).includes(status);

export const dailyOutcomesOf = (jobs: readonly AppJob[]): DailyOutcome[] => {
  const byDay = new Map<string, DailyOutcome>();
  for (const job of jobs) {
    if (!job.finishedAt || !isEnded(job.status)) continue;
    const day = job.finishedAt.slice(0, 10);
    const entry = byDay.get(day) ?? { day, completed: 0, failed: 0, cancelled: 0, orphaned: 0 };
    entry[job.status] += 1;
    byDay.set(day, entry);
  }
  return [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
};

/** The nearest-rank percentile of sorted values. */
const percentile = (sorted: readonly number[], rank: number): number | null => {
  if (sorted.length === 0) return null;
  const index = Math.ceil((rank / 100) * sorted.length) - 1;
  return sorted[Math.min(sorted.length - 1, Math.max(0, index))];
};

export const appStatsOf = (jobs: readonly AppJob[]): AppStats => {
  const durations = jobs
    .flatMap(job =>
      job.startedAt && job.finishedAt
        ? [Date.parse(job.finishedAt) - Date.parse(job.startedAt)]
        : [],
    )
    .filter(duration => Number.isFinite(duration) && duration >= 0)
    .sort((a, b) => a - b);
  const count = (status: AppJob['status']) => jobs.filter(job => job.status === status).length;
  const starts = jobs.flatMap(job => (job.startedAt ? [job.startedAt] : [])).sort();
  return {
    total: jobs.length,
    running: count('running'),
    completed: count('completed'),
    failed: count('failed'),
    cancelled: count('cancelled'),
    orphaned: count('orphaned'),
    lastRunAt: starts.at(-1) ?? '',
    medianDurationMs: percentile(durations, 50),
    p95DurationMs: percentile(durations, 95),
    daily: dailyOutcomesOf(jobs),
  };
};
