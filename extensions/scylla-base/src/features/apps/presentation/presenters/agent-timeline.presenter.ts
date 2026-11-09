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

/** The widest bar of the strip and the gap after it, in pixels, as in the design. */
const BAR_PX = 7;
const BAR_GAP_PX = 2;

/** A month name nearer than this to the first day or to "Today" overlaps it. */
const LABEL_ROOM_PX = 64;

/** A narrower window has no room for its two handles. */
const MIN_WINDOW_PX = 28;

export interface StripDay {
  day: Day;
  outcomes: JobOutcomes;
  total: number;
  incident: boolean;
}

/** The first day of a month, at a part of the width of the strip from 0 to 1. */
export interface StripMark {
  day: Day;
  at: number;
}

/** A part of the strip, from 0 to 1. */
export interface StripSpan {
  left: number;
  width: number;
}

export interface TimelineStrip {
  days: StripDay[];
  /**
   * The columns of the strip, one for each day. A strip with few days has empty columns before
   * its first day, so that its bars are not wider than in the design.
   */
  columns: number;
  /** The most jobs of one day. */
  peak: number;
  /** The label of the first bar, `null` when it is today. */
  start: Day | null;
  months: StripMark[];
  disabled: StripSpan | null;
}

export interface TimelineStripInput {
  bounds: StatsPeriod;
  days: readonly DayOutcomes[];
  /** The day that the agent was disabled. */
  disabled: Day | null;
  /** The width of the strip in pixels, 0 before it is measured. */
  width: number;
}

/** The columns of a strip of `width` pixels for the days of the bounds. */
export const stripColumns = (bounds: StatsPeriod, width: number): number =>
  Math.max(periodDays(bounds), Math.floor((width + BAR_GAP_PX) / (BAR_PX + BAR_GAP_PX)));

/** The days of a period on a strip of `columns` columns, which ends with the days of the bounds. */
export const spanOf = (period: StatsPeriod, bounds: StatsPeriod, columns: number): StripSpan => ({
  left: (columns - periodDays(bounds) + daysBetween(bounds.from, period.from)) / columns,
  width: periodDays(period) / columns,
});

/** The number of days for a move of `pixels` on a strip of `width` pixels. */
export const daysForPixels = (pixels: number, width: number, columns: number): number =>
  width > 0 ? Math.round((pixels / width) * columns) : 0;

/**
 * The box of the window on a strip of `width` pixels: the span, made wider around its middle when
 * its two handles would cover each other, and kept in the strip.
 */
export const windowBox = (span: StripSpan, width: number): StripSpan => {
  const min = width > 0 ? Math.min(1, MIN_WINDOW_PX / width) : 0;
  if (span.width >= min) return span;
  const left = span.left + (span.width - min) / 2;
  return { left: Math.min(Math.max(0, left), 1 - min), width: min };
};

/** A CSS `translate` that centers a label on the box of the window, but keeps it in the strip. */
export const labelShift = (box: StripSpan, width: number): string => {
  const center = (box.left + box.width / 2) * width;
  return `clamp(${-center}px, -50%, calc(${width - center}px - 100%))`;
};

const monthsOf = (bounds: StatsPeriod, columns: number, width: number): StripMark[] => {
  const count = periodDays(bounds);
  const room = LABEL_ROOM_PX / (width > 0 ? width / columns : BAR_PX + BAR_GAP_PX);
  return Array.from({ length: count }, (_, index) => ({ index, day: addDays(bounds.from, index) }))
    .filter(({ index, day }) => day.endsWith('-01') && index >= room && count - index >= room)
    .map(({ index, day }) => ({ day, at: (columns - count + index) / columns }));
};

/** Each day of the bounds with its jobs, the labels under the strip and the disabled days. */
export const timelineStrip = ({
  bounds,
  days,
  disabled,
  width,
}: TimelineStripInput): TimelineStrip => {
  const columns = stripColumns(bounds, width);
  const byDay = new Map(days.map(entry => [dayOf(entry.day), entry.outcomes]));
  const stripDays = Array.from({ length: periodDays(bounds) }, (_, index) => {
    const day = addDays(bounds.from, index);
    const outcomes = byDay.get(day) ?? NO_JOB;
    return { day, outcomes, total: endedJobs(outcomes), incident: isIncident(outcomes) };
  });
  const firstDisabled = disabled === null ? null : addDays(disabled, 1);

  return {
    days: stripDays,
    columns,
    peak: Math.max(0, ...stripDays.map(day => day.total)),
    start: bounds.from === bounds.to ? null : bounds.from,
    months: monthsOf(bounds, columns, width),
    disabled:
      firstDisabled === null || firstDisabled > bounds.to
        ? null
        : spanOf(
            { from: firstDisabled < bounds.from ? bounds.from : firstDisabled, to: bounds.to },
            bounds,
            columns,
          ),
  };
};
