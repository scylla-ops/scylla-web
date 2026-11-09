/** A day of the server, in UTC: `YYYY-MM-DD`. */
export type Day = string;

/** The days of the job stats of an agent, both included. */
export interface StatsPeriod {
  from: Day;
  to: Day;
}

/** The ready-made periods: the last 7, 30 or 90 days, or all the days of the agent. */
export type PeriodPreset = '7d' | '30d' | '90d' | 'all';

export const PERIOD_PRESETS: readonly PeriodPreset[] = ['7d', '30d', '90d', 'all'];

export const DEFAULT_PRESET: PeriodPreset = '30d';

/** The server counts at most this number of days in one period. */
export const MAX_PERIOD_DAYS = 366;

const PRESET_DAYS: Record<Exclude<PeriodPreset, 'all'>, number> = { '7d': 7, '30d': 30, '90d': 90 };

const DAY_MS = 86_400_000;

/** The UTC day of a time. */
export const dayOf = (time: string | Date): Day => new Date(time).toISOString().slice(0, 10);

export const addDays = (day: Day, count: number): Day =>
  dayOf(new Date(Date.parse(day) + count * DAY_MS));

/** 0 for the same day, negative when `to` is before `from`. */
export const daysBetween = (from: Day, to: Day): number =>
  Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS);

export const periodDays = (period: StatsPeriod): number => daysBetween(period.from, period.to) + 1;

export const samePeriod = (a: StatsPeriod, b: StatsPeriod): boolean =>
  a.from === b.from && a.to === b.to;

const clampDay = (day: Day, bounds: StatsPeriod): Day => {
  if (day < bounds.from) return bounds.from;
  return day > bounds.to ? bounds.to : day;
};

/**
 * The days that a period of an agent can cover: from the day of its creation to today, and at
 * most `MAX_PERIOD_DAYS` days, as the server counts them.
 */
export const periodBounds = (joinedAt: string, now: Date): StatsPeriod => {
  const to = dayOf(now);
  const oldest = addDays(to, 1 - MAX_PERIOD_DAYS);
  const joined = joinedAt ? dayOf(joinedAt) : to;
  const from = joined > oldest ? joined : oldest;
  return { from: from > to ? to : from, to };
};

/** The last 30 days, today included, also the days before the creation of the agent. */
export const recentPeriod = (now: Date): StatsPeriod => {
  const to = dayOf(now);
  return { from: addDays(to, 1 - PRESET_DAYS['30d']), to };
};

/** Puts each day of a period in the bounds. A period that ends before it starts is turned. */
export const clampPeriod = (period: StatsPeriod, bounds: StatsPeriod): StatsPeriod => {
  const from = clampDay(period.from, bounds);
  const to = clampDay(period.to, bounds);
  return from <= to ? { from, to } : { from: to, to: from };
};

/** The last days of the bounds, or all of them. */
export const presetPeriod = (preset: PeriodPreset, bounds: StatsPeriod): StatsPeriod =>
  preset === 'all'
    ? bounds
    : clampPeriod({ from: addDays(bounds.to, 1 - PRESET_DAYS[preset]), to: bounds.to }, bounds);

/** Moves a period by `count` days, as far as the bounds let it go, with the same length. */
export const shiftPeriod = (
  period: StatsPeriod,
  count: number,
  bounds: StatsPeriod,
): StatsPeriod => {
  const earliest = daysBetween(period.from, bounds.from);
  const latest = daysBetween(period.to, bounds.to);
  const shift = Math.max(earliest, Math.min(count, latest));
  return { from: addDays(period.from, shift), to: addDays(period.to, shift) };
};

/** Moves the first day, in the bounds and not after the last day. */
export const withStart = (period: StatsPeriod, day: Day, bounds: StatsPeriod): StatsPeriod => ({
  from: clampDay(day, { from: bounds.from, to: period.to }),
  to: period.to,
});

/** Moves the last day, in the bounds and not before the first day. */
export const withEnd = (period: StatsPeriod, day: Day, bounds: StatsPeriod): StatsPeriod => ({
  from: period.from,
  to: clampDay(day, { from: period.from, to: bounds.to }),
});
