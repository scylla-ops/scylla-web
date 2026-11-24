import { createQuery } from '@scylla/core-sdk';
import { jobQueries } from '@base/features/jobs';
import {
  rankingRows,
  type RankingMetric,
} from '@base/features/dashboard/presentation/presenters/ranking.presenter.ts';
import type { DashboardWidgets } from '../dashboard-widgets.state.svelte.ts';

export const RANKED_PIPELINES = 10;

export const createRanking = (widgets: () => DashboardWidgets, metric: () => RankingMetric) => {
  const stats = createQuery(() =>
    jobQueries.stats(
      widgets().workspaceId,
      widgets().periodScope,
      {
        compare: true,
        groupBy: 'pipeline',
        groupOrder: metric() === 'slowest' ? 'p50-duration' : 'failed',
        groupLimit: RANKED_PIPELINES,
        ...(widgets().projectIds.length > 0 && { projectIds: widgets().projectIds }),
      },
      widgets().canReadJobs,
    ),
  );
  const rows = $derived(
    rankingRows(stats.data?.groups ?? [], metric(), id => {
      const pipeline = widgets().pipelines.get(id);
      return pipeline && { name: pipeline.name, project: pipeline.projectName };
    }),
  );

  return {
    stats,
    get rows() {
      return rows;
    },
  };
};
