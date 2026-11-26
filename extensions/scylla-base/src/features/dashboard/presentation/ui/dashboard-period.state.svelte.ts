import { contextStore, currentPathname, currentSearch, navigateTo } from '@platform/context';
import { toRune } from '@scylla/ui/stores';
import { createWorkspaceOf } from '@base/features/workspace';
import {
  DEFAULT_PERIOD,
  bucketPeriod,
  customPeriodFrom,
  customPeriodIssue,
  periodRange,
  type DashboardPeriod,
  type PeriodBucket,
  type PeriodKind,
  type PeriodRange,
} from '@base/features/dashboard/presentation/presenters/period.presenter.ts';
import {
  currentInstant,
  dayIn,
  knownTimeZone,
  type Day,
} from '@base/features/dashboard/presentation/presenters/zoned-day.presenter.ts';
import {
  parsePeriodSearch,
  writePeriodSearch,
} from '@base/features/dashboard/presentation/mappers/period-search.mapper.ts';

/**
 * The period that the dashboard shows, and the time zone of the workspace that its days use.
 * The period is in the URL (`?period=7d`, `?from=…&to=…`), so that a link or a reload keeps it.
 * The zone is `null` until the workspaces load: the days then count in UTC.
 */
export const createDashboardPeriod = (now: () => Date = currentInstant) => {
  const context = toRune(contextStore);
  const workspaceId = $derived(context().workspace.id);
  const current = createWorkspaceOf(() => workspaceId);

  const timeZone = $derived.by((): string | null => {
    const zone = current.workspace?.timeZone;
    return zone ? knownTimeZone(zone) : null;
  });

  const today = (): Day => dayIn(now(), timeZone ?? 'UTC');

  let revision = $state(0);

  const period = $derived.by((): DashboardPeriod => {
    void revision;
    const chosen = parsePeriodSearch(currentSearch());
    if (!chosen) return DEFAULT_PERIOD;
    if (chosen.kind === 'custom' && customPeriodIssue(chosen.from, chosen.to, today())) {
      return DEFAULT_PERIOD;
    }
    return chosen;
  });

  const write = (next: DashboardPeriod) => {
    navigateTo(`${currentPathname()}${writePeriodSearch(currentSearch(), next)}`, {
      replace: true,
    });
    revision += 1;
  };

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
      write(kind === 'custom' ? customPeriodFrom(period, today()) : { kind });
    },
    applyCustom: (from: Day, to: Day) => {
      write({ kind: 'custom', from, to });
    },
    /**
     * The URL of this page on the day or the week of a bar of a chart. `null` for a bar of one
     * hour: a custom period has whole days.
     */
    bucketHref: (start: string, bucket: PeriodBucket): string | null => {
      const next = bucketPeriod(start, bucket, timeZone ?? 'UTC', today());
      return next && `${currentPathname()}${writePeriodSearch(currentSearch(), next)}`;
    },
    /** The instants of the period at `at`: a query reads them when it runs, not in its key. */
    rangeAt: (at: Date = now()): PeriodRange => periodRange(period, at, timeZone ?? 'UTC'),
  };
};

export type DashboardPeriodState = ReturnType<typeof createDashboardPeriod>;
