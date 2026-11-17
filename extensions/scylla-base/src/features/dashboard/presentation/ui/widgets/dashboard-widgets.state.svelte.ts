import { Permission, can } from '@platform/authz';
import { contextStore } from '@platform/context';
import { createQuery } from '@scylla/core-sdk';
import { toRune } from '@scylla/ui/stores';
import { jobQueries, type PeriodScope } from '@base/features/jobs';
import { pipelineQueries } from '@base/features/pipeline';
import type { DashboardPeriodState } from '@base/features/dashboard/presentation/ui/dashboard-period.state.svelte.ts';
import type { PeriodRange } from '@base/features/dashboard/presentation/presenters/period.presenter.ts';
import { pipelinesById } from '@base/features/dashboard/presentation/presenters/widget-rows.presenter.ts';

/** The last jobs of each pipeline that the Pipelines widget shows. */
export const PIPELINE_RUNS = 20;

const LIVE_REFRESH_MS = 5_000;
const ACTIVITY_REFRESH_MS = 10_000;
const ACTIVITY_LIMIT = 20;
const LIVE_LIMIT = 50;

/**
 * The queries of the widgets, each from the module that owns its data. The queries of a period
 * get the period of the page: its name goes in the key, and its instants are read when a query
 * runs. The pipelines and the live jobs do not depend on the period.
 */
export const createDashboardWidgets = (period: DashboardPeriodState) => {
  const context = toRune(contextStore);
  const workspaceId = $derived(context().workspace.id);
  const canReadJobs = $derived(can(Permission.LIST_JOBS_BY_WORKSPACE));
  const canReadPipelines = $derived(can(Permission.LIST_PIPELINES_BY_WORKSPACE));

  const scope = $derived<PeriodScope<PeriodRange>>({
    scope: [period.period, period.timeZone ?? 'UTC'],
    range: () => period.rangeAt(),
  });

  const stats = createQuery(() =>
    jobQueries.stats(workspaceId, scope, { compare: true }, canReadJobs),
  );
  const summaries = createQuery(() =>
    pipelineQueries.summaries(
      workspaceId,
      { runs: PIPELINE_RUNS, order: 'failing-first', limit: 100 },
      canReadPipelines,
    ),
  );
  const live = createQuery(() =>
    jobQueries.newest(
      workspaceId,
      { statuses: ['running', 'pending', 'awaiting_approval'], limit: LIVE_LIMIT },
      { refetchMs: LIVE_REFRESH_MS, enabled: canReadJobs },
    ),
  );
  const ended = createQuery(() =>
    jobQueries.newest(
      workspaceId,
      { statuses: ['completed', 'failed', 'cancelled', 'orphaned'], limit: ACTIVITY_LIMIT },
      { period: scope, refetchMs: ACTIVITY_REFRESH_MS, enabled: canReadJobs },
    ),
  );

  const pipelines = $derived(pipelinesById(summaries.data?.items ?? []));

  return {
    get canReadJobs() {
      return canReadJobs;
    },
    get canReadPipelines() {
      return canReadPipelines;
    },
    stats,
    summaries,
    live,
    ended,
    /** The summaries by pipeline id: the names of the jobs of the other widgets. */
    get pipelines() {
      return pipelines;
    },
  };
};

export type DashboardWidgets = ReturnType<typeof createDashboardWidgets>;
