import {
  periodDays,
  type StatsPeriod,
} from '@base/features/apps/domain/structs/stats-period.struct.ts';

/** An agent that joined fewer days ago shows one line: a chart of one day says nothing. */
export const MIN_CHART_DAYS = 2;
/** An agent that joined fewer days ago has no timeline: its chart shows each day since. */
export const MIN_TIMELINE_DAYS = 14;

/**
 * How much the activity of an agent shows. `none`: no ended job. `line`: one sentence, for an agent
 * that joined today. `chart`: the figures and the chart of each day since it joined. `timeline`: the
 * periods, the timeline window, the figures and the chart.
 */
export type ActivityLevel = 'none' | 'line' | 'chart' | 'timeline';

/** `bounds`: from the creation of the agent to today. */
export const activityLevel = (endedJobs: boolean, bounds: StatsPeriod): ActivityLevel => {
  if (!endedJobs) return 'none';
  const days = periodDays(bounds);
  if (days < MIN_CHART_DAYS) return 'line';
  return days < MIN_TIMELINE_DAYS ? 'chart' : 'timeline';
};
