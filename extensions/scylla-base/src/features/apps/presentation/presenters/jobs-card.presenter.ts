import { t } from '@scylla/ui/i18n';
import { formatUtcDay } from '@shared/utils/date-utils.ts';
import {
  endedJobs,
  successRate,
  type AgentStats,
} from '@base/features/apps/domain/structs/agent-stats.struct.ts';
import type { Day, StatsPeriod } from '@base/features/apps/domain/structs/stats-period.struct.ts';
import type { ChartZone, JobsChart } from './jobs-chart.presenter.ts';
import { periodRange } from './period-range.presenter.ts';
import { agentPageMessages as messages } from '@base/features/apps/presentation/messages/agent-page.messages.ts';

/** A hatched zone of the chart, with an optional pill. */
export interface LabelledZone extends ChartZone {
  label?: string;
}

export interface JobsCardInput {
  stats: AgentStats | undefined;
  chart: JobsChart;
  period: StatsPeriod;
  today: Day;
  /** The day that the agent was disabled. */
  disabled: Day | null;
  /** The agent never connected. */
  never: boolean;
  /** The page shows a timeline, with a window that the user can drag. */
  withTimeline: boolean;
}

export interface JobsCardText {
  /** The line under the title. */
  summary: string;
  /** The name of the chart for a screen reader. */
  label: string;
  zones: LabelledZone[];
  /** The line under the chart, when the chart has no job to show. */
  note: string | null;
}

/** The texts of the card of the jobs of a period, and its hatched zones. */
export const jobsCardText = (input: JobsCardInput): JobsCardText => {
  const { stats, chart, period, today, disabled, never, withTimeline } = input;
  const total = stats ? endedJobs(stats.outcomes) : 0;
  const rate = stats ? successRate(stats.outcomes) : null;
  const range = periodRange(period, today);
  const disabledDay = disabled ? formatUtcDay(disabled) : '';

  const summary =
    rate !== null
      ? t(messages.chartSummary(range, total, Math.round(rate * 100)))
      : disabled
        ? t(messages.chartDisabled(range, disabledDay))
        : t(messages.chartEmpty(range));
  const zones: LabelledZone[] = never
    ? [{ start: 0, end: chart.bars.length }]
    : [
        ...(chart.notJoined ? [{ ...chart.notJoined, label: t(messages.notJoined) }] : []),
        ...(chart.disabled
          ? [{ ...chart.disabled, label: t(messages.disabledSince(disabledDay)) }]
          : []),
      ];
  const note = never
    ? t(messages.notConnected)
    : disabled && stats && total === 0 && withTimeline
      ? t(messages.noJobInPeriod(disabledDay))
      : null;

  return { summary, label: t(messages.chartLabel(total, range)), zones, note };
};
