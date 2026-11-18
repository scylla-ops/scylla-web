import { i18n } from '@lingui/core';
import { deltaTrend, type ChartTone } from '@scylla/ui';
import { t } from '@scylla/ui/i18n';
import type { AppEntity } from '@base/features/apps';
import { decidedJobs, type JobBucket, type JobEntity, type JobOutcomes } from '@base/features/jobs';
import { widgetMessages } from '@base/features/dashboard/presentation/messages/widgets.messages.ts';
import { viewMessages } from '@base/features/dashboard/presentation/messages/widgets-view.messages.ts';
import type {
  DashboardPeriod,
  PeriodBucket,
} from '@base/features/dashboard/presentation/presenters/period.presenter.ts';
import { customPeriodLabel } from '@base/features/dashboard/presentation/presenters/period-options.presenter.ts';
import { dashboardMessages } from '@base/features/dashboard/presentation/messages/dashboard.messages.ts';
import {
  statusTone,
  type ChangeView,
} from '@base/features/dashboard/presentation/presenters/job-figures.presenter.ts';

const MINUS = '−';
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** A whole number with a thin space for the thousands: "1 312". */
export const countText = (value: number): string =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(value));

/** The parts of the bar of a ratio, in percent of the decided jobs. */
export const outcomeShares = (
  outcomes: JobOutcomes,
): { completed: number; failed: number; orphaned: number } => {
  const total = decidedJobs(outcomes);
  if (total === 0) return { completed: 0, failed: 0, orphaned: 0 };
  return {
    completed: (outcomes.completed / total) * 100,
    failed: (outcomes.failed / total) * 100,
    orphaned: (outcomes.orphaned / total) * 100,
  };
};

/** "11.7 per day": the mean of the buckets. */
export const perBucketText = (total: number, buckets: number, bucket: PeriodBucket): string => {
  const mean = buckets > 0 ? total / buckets : 0;
  const value = mean.toFixed(1);
  if (bucket === 'hour') return t(viewMessages.perHour(value));
  if (bucket === 'week') return t(viewMessages.perWeek(value));
  return t(viewMessages.perDay(value));
};

/** "+12 vs previous": a change of a count. More jobs is neither good nor bad. */
export const countChange = (now: number, before: number | null): ChangeView | null => {
  if (before === null) return null;
  const change = now - before;
  const label = `${change > 0 ? '+' : change < 0 ? MINUS : ''}${Math.abs(change)}`;
  return { label: t(viewMessages.vsPrevious(label)), ...deltaTrend(change, 'up') };
};

/** The heights of the run time of each bucket, in percent of the highest. */
export const runTimeBars = (buckets: readonly JobBucket[]): { start: string; height: number }[] => {
  const highest = Math.max(0, ...buckets.map(bucket => bucket.figures.runTime));
  return buckets.map(bucket => ({
    start: bucket.start,
    height: highest > 0 ? Math.max(4, (bucket.figures.runTime / highest) * 100) : 4,
  }));
};

/** One job of the last 24 hours on the time axis. */
export interface TimelineTick {
  id: string;
  /** From the left, in percent of 24 hours. */
  left: number;
  /** In percent of the height of the axis. */
  height: number;
  tone: ChartTone;
}

const TICK_HEIGHT: Partial<Record<ChartTone, number>> = { failed: 100, canceled: 70 };

/** The ended jobs of the last 24 hours as ticks, the oldest at the left. */
export const timelineTicks = (jobs: readonly JobEntity[], now: number): TimelineTick[] =>
  jobs
    .filter(job => job.finishedAt)
    .map(job => {
      const at = Date.parse(job.createdAt);
      const tone = statusTone(job.status);
      return {
        id: job.id,
        left: Math.min(100, Math.max(0, ((at - (now - DAY_MS)) / DAY_MS) * 100)),
        height: TICK_HEIGHT[tone] ?? 45,
        tone,
      };
    })
    .sort((a, b) => a.left - b.left);

/** The labels under the axis of the last 24 hours. */
export const timelineAxis = (): string[] => [
  t(viewMessages.hoursAgo(24)),
  t(viewMessages.hours(18)),
  t(viewMessages.hours(12)),
  t(viewMessages.hours(6)),
  t(widgetMessages.now),
];

/** The agents and their job slots. A slot of an agent that is not connected is offline. */
export interface Capacity {
  online: number;
  total: number;
  busy: number;
  slots: number;
  states: ('busy' | 'free' | 'offline')[];
  /** The first agent that is not connected. */
  offline: string | null;
}

export const capacityOf = (agents: readonly AppEntity[]): Capacity => {
  const enabled = agents.filter(agent => !agent.disabledAt);
  const states: Capacity['states'] = [];
  for (const agent of enabled) {
    const slots = Math.max(1, agent.host?.capacity ?? 1);
    const busy = agent.connected ? Math.min(slots, agent.runningJobs) : 0;
    for (let index = 0; index < slots; index += 1) {
      states.push(!agent.connected ? 'offline' : index < busy ? 'busy' : 'free');
    }
  }
  const online = enabled.filter(agent => agent.connected);
  return {
    online: online.length,
    total: enabled.length,
    busy: states.filter(state => state === 'busy').length,
    slots: online.reduce((sum, agent) => sum + Math.max(1, agent.host?.capacity ?? 1), 0),
    states,
    offline: enabled.find(agent => !agent.connected)?.name ?? null,
  };
};

/** "Thursday 6 November, 11:20" in the zone of the workspace, in the language of the app. */
export const dateLine = (now: Date, timeZone: string): string =>
  new Intl.DateTimeFormat(!i18n.locale || i18n.locale === 'en' ? 'en-GB' : i18n.locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone,
  })
    .format(now)
    .replace(' at ', ', ');

const SHORT_PERIODS = {
  '24h': dashboardMessages.last24Hours,
  '7d': dashboardMessages.last7Days,
  '14d': dashboardMessages.last14Days,
  '30d': dashboardMessages.last30Days,
} as const;

/** The period beside a figure: "14 d", or the days of a custom period. */
export const shortPeriod = (period: DashboardPeriod): string =>
  period.kind === 'custom' ? customPeriodLabel(period.from, period.to) : t(SHORT_PERIODS[period.kind]);
