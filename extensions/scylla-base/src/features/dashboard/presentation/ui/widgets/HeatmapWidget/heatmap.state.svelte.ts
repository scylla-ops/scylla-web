import { createQuery } from '@scylla/core-sdk';
import { jobQueries, type PeriodScope } from '@base/features/jobs';
import {
  heatmapRange,
  heatLevels,
  weekGrid,
} from '@base/features/dashboard/presentation/presenters/heatmap.presenter.ts';
import type { PeriodRange } from '@base/features/dashboard/presentation/presenters/period.presenter.ts';
import { currentInstant } from '@base/features/dashboard/presentation/presenters/zoned-day.presenter.ts';
import type { DashboardPeriodState } from '@base/features/dashboard/presentation/ui/dashboard-period.state.svelte.ts';
import type { DashboardWidgets } from '../dashboard-widgets.state.svelte.ts';

export const createHeatmap = (widgets: () => DashboardWidgets, period: () => DashboardPeriodState) => {
  const zone = $derived(period().timeZone ?? 'UTC');
  const scope = $derived<PeriodScope<PeriodRange>>({
    scope: ['heatmap', period().period, zone],
    range: () => {
      const { from, to, bucket } = heatmapRange(period().period, currentInstant(), zone);
      return { from, to, bucket };
    },
  });
  const stats = createQuery(() =>
    jobQueries.stats(
      widgets().workspaceId,
      scope,
      widgets().projectIds.length > 0 ? { projectIds: widgets().projectIds } : {},
      widgets().canReadJobs,
    ),
  );
  const days = $derived(heatmapRange(period().period, currentInstant(), zone).days);
  const grid = $derived(weekGrid(stats.data?.buckets ?? [], zone, bucket => bucket.figures.created));
  const levels = $derived(heatLevels(grid));
  const total = $derived(stats.data?.totals.created ?? 0);

  return {
    stats,
    get days() {
      return days;
    },
    get grid() {
      return grid;
    },
    get levels() {
      return levels;
    },
    get total() {
      return total;
    },
  };
};
