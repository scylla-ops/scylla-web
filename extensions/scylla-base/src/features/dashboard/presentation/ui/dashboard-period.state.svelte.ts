import { contextStore } from '@platform/context';
import { createQuery } from '@scylla/core-sdk';
import { toRune } from '@scylla/ui/stores';
import { workspaceQueries } from '@base/features/workspace';
import {
  DEFAULT_PERIOD,
  customPeriodFrom,
  periodRange,
  type DashboardPeriod,
  type PeriodKind,
  type PeriodRange,
} from '@base/features/dashboard/presentation/presenters/period.presenter.ts';
import {
  currentInstant,
  dayIn,
  knownTimeZone,
  type Day,
} from '@base/features/dashboard/presentation/presenters/zoned-day.presenter.ts';

/**
 * The period that the dashboard shows, and the time zone of the workspace that its days use.
 * The zone is `null` until the workspaces load: the days then count in UTC.
 */
export const createDashboardPeriod = (now: () => Date = currentInstant) => {
  const context = toRune(contextStore);
  const workspaceId = $derived(context().workspace.id);
  const workspaces = createQuery(() => workspaceQueries.mine());

  const timeZone = $derived.by((): string | null => {
    const zone = workspaces.data?.find(workspace => workspace.id === workspaceId)?.timeZone;
    return zone ? knownTimeZone(zone) : null;
  });

  let period = $state<DashboardPeriod>(DEFAULT_PERIOD);

  const today = (): Day => dayIn(now(), timeZone ?? 'UTC');

  return {
    get period() {
      return period;
    },
    get timeZone() {
      return timeZone;
    },
    today,
    /** `custom` keeps the days of the current period until the user applies other days. */
    select: (kind: PeriodKind) => {
      period = kind === 'custom' ? customPeriodFrom(period, today()) : { kind };
    },
    applyCustom: (from: Day, to: Day) => {
      period = { kind: 'custom', from, to };
    },
    /** The instants of the period at `at`: a query reads them when it runs, not in its key. */
    rangeAt: (at: Date = now()): PeriodRange => periodRange(period, at, timeZone ?? 'UTC'),
  };
};

export type DashboardPeriodState = ReturnType<typeof createDashboardPeriod>;
