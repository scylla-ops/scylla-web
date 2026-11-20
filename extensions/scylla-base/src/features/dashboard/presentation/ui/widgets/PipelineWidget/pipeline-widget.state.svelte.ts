import { Permission, can } from '@platform/authz';
import { createQuery } from '@scylla/core-sdk';
import { jobQueries } from '@base/features/jobs';
import { createRunPipeline, pipelineQueries } from '@base/features/pipeline';
import {
  lastRunOf,
  pipelineTone,
  stageChips,
} from '@base/features/dashboard/presentation/presenters/pipeline-widget.presenter.ts';
import { shortJobId } from '@base/features/dashboard/presentation/presenters/job-figures.presenter.ts';
import { pipelineRows } from '@base/features/dashboard/presentation/presenters/widget-rows.presenter.ts';
import type { DashboardPeriodState } from '@base/features/dashboard/presentation/ui/dashboard-period.state.svelte.ts';
import { PIPELINE_RUNS, type DashboardWidgets } from '../dashboard-widgets.state.svelte.ts';

export const createPipelineWidget = (
  widgets: () => DashboardWidgets,
  period: () => DashboardPeriodState,
  target: () => string | undefined,
) => {
  const pipelineId = $derived(target() ?? '');
  const summaries = createQuery(() =>
    pipelineQueries.summaries(
      widgets().workspaceId,
      { runs: PIPELINE_RUNS, order: 'name', limit: 1, pipelineIds: [pipelineId] },
      !!pipelineId && widgets().canReadPipelines,
    ),
  );
  const summary = $derived(summaries.data?.items.find(item => item.id === pipelineId));
  const stats = createQuery(() =>
    jobQueries.stats(widgets().workspaceId, widgets().periodScope, { pipelineIds: [pipelineId] }, !!summary && widgets().canReadJobs),
  );
  const newest = createQuery(() => jobQueries.byPipeline(pipelineId, { page: 1, pageSize: 1 }, { enabled: !!summary }));
  const runner = createRunPipeline();

  const row = $derived(summary ? pipelineRows([summary], PIPELINE_RUNS, period().timeZone ?? 'UTC')[0] : undefined);

  return {
    summaries,
    get summary() {
      return summary;
    },
    get row() {
      return row;
    },
    get unset() {
      return !pipelineId;
    },
    get gone() {
      return !!pipelineId && summaries.isSuccess && !summary;
    },
    get tone() {
      return summary ? pipelineTone(summary) : 'muted';
    },
    get lastRun() {
      return summary ? lastRunOf(summary) : null;
    },
    get runs() {
      return stats.data?.totals.created ?? null;
    },
    get stages() {
      return stageChips(newest.data?.items[0]);
    },
    get newestShortId() {
      const job = newest.data?.items[0];
      return job ? shortJobId(job.id) : null;
    },
    get canRun() {
      return can(Permission.RUN_PIPELINE);
    },
    get isRunning() {
      return runner.isRunning(pipelineId);
    },
    run: () => runner.run(pipelineId),
  };
};
