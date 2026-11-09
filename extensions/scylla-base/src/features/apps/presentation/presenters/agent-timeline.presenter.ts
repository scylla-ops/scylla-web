import {
  endedJobs,
  isIncident,
  type DayOutcomes,
  type JobOutcomes,
} from '@base/features/apps/domain/structs/agent-stats.struct.ts';
import {
  addDays,
  daysBetween,
  dayOf,
  periodDays,
  type Day,
  type StatsPeriod,
} from '@base/features/apps/domain/structs/stats-period.struct.ts';

const NO_JOB: JobOutcomes = { completed: 0, failed: 0, cancelled: 0, orphaned: 0 };

/** A month name nearer than this part of the strip to the first day or to "Today" overlaps it. */
const LABEL_ROOM = 0.06;

export interface StripDay {
  day: Day;
  outcomes: JobOutcomes;
  total: number;
  incident: boolean;
}

/** A label under the strip, at a part of its width from 0 to 1. */
export interface StripMark {
  day: Day;
  at: number;
  kind: 'start' | 'month' | 'today';
}

/** A part of the strip, from 0 to 1. */
export interface StripSpan {
  left: number;
  width: number;
}

export interface TimelineStrip {
  days: StripDay[];
  /** The most jobs of one day. */
  peak: number;
  marks: StripMark[];
  disabled: StripSpan | null;
}

export interface TimelineStripInput {
  bounds: StatsPeriod;
  days: readonly DayOutcomes[];
  /** The day that the agent was disabled. */
  disabled: Day | null;
}

/** The days of a period on the strip of the bounds. */
export const spanOf = (period: StatsPeriod, bounds: StatsPeriod): StripSpan => {
  const count = periodDays(bounds);
  return {
    left: daysBetween(bounds.from, period.from) / count,
    width: periodDays(period) / count,
  };
};

/** The number of days for a move of `pixels` on a strip of `width` pixels. */
export const daysForPixels = (pixels: number, width: number, bounds: StatsPeriod): number =>
  width > 0 ? Math.round((pixels / width) * periodDays(bounds)) : 0;

const marksOf = (bounds: StatsPeriod): StripMark[] => {
  const count = periodDays(bounds);
  const months = Array.from({ length: count }, (_, index) => addDays(bounds.from, index))
    .map((day, index) => ({ day, at: index / count, kind: 'month' as const }))
    .filter(mark => mark.day.endsWith('-01') && mark.at >= LABEL_ROOM && mark.at <= 1 - LABEL_ROOM);
  return [
    { day: bounds.from, at: 0, kind: 'start' },
    ...months,
    { day: bounds.to, at: 1, kind: 'today' },
  ];
};

/** Each day of the bounds with its jobs, the labels under the strip and the disabled days. */
export const timelineStrip = ({ bounds, days, disabled }: TimelineStripInput): TimelineStrip => {
  const byDay = new Map(days.map(entry => [dayOf(entry.day), entry.outcomes]));
  const stripDays = Array.from({ length: periodDays(bounds) }, (_, index) => {
    const day = addDays(bounds.from, index);
    const outcomes = byDay.get(day) ?? NO_JOB;
    return { day, outcomes, total: endedJobs(outcomes), incident: isIncident(outcomes) };
  });
  const firstDisabled = disabled === null ? null : addDays(disabled, 1);

  return {
    days: stripDays,
    peak: Math.max(0, ...stripDays.map(day => day.total)),
    marks: marksOf(bounds),
    disabled:
      firstDisabled === null || firstDisabled > bounds.to
        ? null
        : spanOf(
            { from: firstDisabled < bounds.from ? bounds.from : firstDisabled, to: bounds.to },
            bounds,
          ),
  };
};
