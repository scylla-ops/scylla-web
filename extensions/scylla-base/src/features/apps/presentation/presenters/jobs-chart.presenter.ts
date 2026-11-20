import {
  endedJobs,
  sumOutcomes,
  type DayOutcomes,
  type JobOutcomes,
} from '@base/features/apps/domain/structs/agent-stats.struct.ts';
import {
  addDays,
  dayOf,
  periodDays,
  type Day,
  type StatsPeriod,
} from '@base/features/apps/domain/structs/stats-period.struct.ts';

/** A longer period shows one bar for each week. */
export const MAX_DAILY_BARS = 90;

const NO_JOB: JobOutcomes = { completed: 0, failed: 0, cancelled: 0, orphaned: 0 };

/** The bars under a label: one for each week, at most. */
const LABELS = 6;

export type ChartUnit = 'day' | 'week';

export interface ChartBar {
  from: Day;
  to: Day;
  outcomes: JobOutcomes;
  total: number;
}

/** Bars from `start` to `end` (excluded) that show a hatched zone in place of their jobs. */
export interface ChartZone {
  start: number;
  end: number;
}

export interface JobsChart {
  unit: ChartUnit;
  bars: ChartBar[];
  /** The top of the scale. */
  max: number;
  /** The bars that show their first day under them. */
  labels: number[];
  notJoined: ChartZone | null;
  disabled: ChartZone | null;
}

export interface JobsChartInput {
  period: StatsPeriod;
  days: readonly DayOutcomes[];
  /** The day of the creation of the agent. */
  joined: Day;
  /** The day that the agent was disabled. */
  disabled: Day | null;
}

/** The top of a scale for `peak` jobs: 2, 4, 6, 8, 10, 20, 30, 40, 50, 60, 80, 100… At least 10. */
export const niceMax = (peak: number): number => {
  if (peak <= 0) return 10;
  if (peak <= 8) return Math.ceil(peak / 2) * 2;
  for (let magnitude = 10; ; magnitude *= 10) {
    const step = [1, 2, 3, 4, 5, 6, 8, 10].find(multiple => multiple * magnitude >= peak);
    if (step !== undefined) return step * magnitude;
  }
};

/** Days, or weeks that end on the last day of the period. The first week can be shorter. */
const bucketsOf = (period: StatsPeriod, unit: ChartUnit): { from: Day; to: Day }[] => {
  const size = unit === 'week' ? 7 : 1;
  const count = Math.ceil(periodDays(period) / size);
  return Array.from({ length: count }, (_, index) => {
    const to = addDays(period.to, -(count - 1 - index) * size);
    const from = addDays(to, 1 - size);
    return { from: from < period.from ? period.from : from, to };
  });
};

/** The first bar, one bar each week (or each few weeks), and the last bar. */
const labelsOf = (count: number, unit: ChartUnit): number[] => {
  if (count <= 8) return Array.from({ length: count }, (_, index) => index);
  const perWeek = unit === 'day' ? 7 : 1;
  const stride = perWeek * Math.ceil(count / (perWeek * LABELS));
  const labels: number[] = [];
  for (let index = 0; count - 1 - index >= stride / 2; index += stride) labels.push(index);
  return [...labels, count - 1];
};

const zoneOf = (
  bars: readonly ChartBar[],
  inZone: (bar: ChartBar) => boolean,
): ChartZone | null => {
  const start = bars.findIndex(inZone);
  if (start === -1) return null;
  const after = bars.findIndex((bar, index) => index > start && !inZone(bar));
  return { start, end: after === -1 ? bars.length : after };
};

/** The bars of a period, its scale, its date labels and its zones with no job. */
export const jobsChart = ({ period, days, joined, disabled }: JobsChartInput): JobsChart => {
  const unit: ChartUnit = periodDays(period) > MAX_DAILY_BARS ? 'week' : 'day';
  const byDay = new Map(days.map(entry => [dayOf(entry.day), entry.outcomes]));

  const bars = bucketsOf(period, unit).map(({ from, to }) => {
    const outcomes = sumOutcomes(
      Array.from({ length: periodDays({ from, to }) }, (_, index) => {
        return byDay.get(addDays(from, index)) ?? NO_JOB;
      }),
    );
    return { from, to, outcomes, total: endedJobs(outcomes) };
  });

  return {
    unit,
    bars,
    max: niceMax(Math.max(0, ...bars.map(bar => bar.total))),
    labels: labelsOf(bars.length, unit),
    notJoined: zoneOf(bars, bar => bar.to < joined),
    disabled: disabled === null ? null : zoneOf(bars, bar => bar.from > disabled),
  };
};
