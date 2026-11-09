import {
  addDays,
  samePeriod,
  shiftPeriod,
  withEnd,
  withStart,
  type StatsPeriod,
} from '@base/features/apps/domain/structs/stats-period.struct.ts';

/** The window moves as a whole, or one of its edges moves. */
export type WindowPart = 'move' | 'start' | 'end';

export interface TimelineWindow {
  /** The period under the window: the one that the user drags, or else the chosen one. */
  readonly shown: StatsPeriod;
  readonly dragging: boolean;
  begin: () => void;
  /** Moves a part by a number of days from where the drag began. */
  drag: (part: WindowPart, days: number) => void;
  /** Ends the drag and chooses the new period. */
  end: () => void;
  /** Moves a part by a number of days and chooses the new period at once. */
  step: (part: WindowPart, days: number) => void;
}

interface Props {
  period: StatsPeriod;
  bounds: StatsPeriod;
  onChange: (period: StatsPeriod) => void;
}

/** The window of the timeline. A drag changes the period only at its end, so the URL gets one entry. */
export const createTimelineWindow = (props: () => Props): TimelineWindow => {
  let origin = $state<StatsPeriod | null>(null);
  let draft = $state<StatsPeriod | null>(null);

  const moved = (period: StatsPeriod, part: WindowPart, days: number): StatsPeriod => {
    const { bounds } = props();
    if (part === 'move') return shiftPeriod(period, days, bounds);
    if (part === 'start') return withStart(period, addDays(period.from, days), bounds);
    return withEnd(period, addDays(period.to, days), bounds);
  };

  const choose = (period: StatsPeriod) => {
    if (!samePeriod(period, props().period)) props().onChange(period);
  };

  return {
    get shown() {
      return draft ?? props().period;
    },
    get dragging() {
      return origin !== null;
    },
    begin: () => {
      origin = props().period;
      draft = origin;
    },
    drag: (part, days) => {
      if (origin) draft = moved(origin, part, days);
    },
    end: () => {
      if (draft) choose(draft);
      origin = null;
      draft = null;
    },
    step: (part, days) => choose(moved(props().period, part, days)),
  };
};
