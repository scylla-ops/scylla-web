import { Permission, can } from '@platform/authz';
import { contextStore } from '@platform/context';
import { createQuery } from '@scylla/core-sdk';
import { toRune } from '@scylla/ui/stores';
import { appQueries } from '@base/features/apps';
import { jobQueries, type JobEntity, type PeriodScope } from '@base/features/jobs';
import { pipelineQueries } from '@base/features/pipeline';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import { attentionQueries, visitSince } from '@base/features/dashboard/presentation/attention.queries.ts';
import type { DashboardPeriodState } from '@base/features/dashboard/presentation/ui/dashboard-period.state.svelte.ts';
import type { PeriodRange } from '@base/features/dashboard/presentation/presenters/period.presenter.ts';
import { pipelinesById } from '@base/features/dashboard/presentation/presenters/widget-rows.presenter.ts';

/** The last jobs of each pipeline that the Pipelines widget shows. */
export const PIPELINE_RUNS = 20;

const LIVE_REFRESH_MS = 5_000;
const ACTIVITY_REFRESH_MS = 10_000;
const ACTIVITY_LIMIT = 20;
const LIVE_LIMIT = 50;
const DAY_LIMIT = 100;
const DAY_MS = 24 * 60 * 60 * 1000;

const lastDayRange = () => ({ from: new Date(Date.now() - DAY_MS), to: null });

/**
 * The queries of the widgets, each from the module that owns its data. The queries of a period
 * get the period of the page: its name goes in the key, and its instants are read when a query
 * runs. `projectId` limits the widgets to one project; `null` shows the whole workspace.
 */
export const createDashboardWidgets = (
  period: DashboardPeriodState,
  projectId: () => string | null = () => null,
) => {
  const context = toRune(contextStore);
  const workspaceId = $derived(context().workspace.id);
  const canReadJobs = $derived(can(Permission.LIST_JOBS_BY_WORKSPACE));
  const canReadPipelines = $derived(can(Permission.LIST_PIPELINES_BY_WORKSPACE));

  const scope = $derived<PeriodScope<PeriodRange>>({
    scope: [period.period, period.timeZone ?? 'UTC'],
    range: () => period.rangeAt(),
  });
  const lastDay = $derived<PeriodScope<{ from: Date; to: Date | null }>>({
    scope: ['last-24-hours'],
    range: lastDayRange,
  });

  const stats = createQuery(() =>
    jobQueries.stats(
      workspaceId,
      scope,
      { compare: true, ...(projectId() ? { projectIds: [projectId()!] } : {}) },
      canReadJobs,
    ),
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
  const day = createQuery(() =>
    jobQueries.newest(
      workspaceId,
      { limit: DAY_LIMIT },
      { period: lastDay, refetchMs: ACTIVITY_REFRESH_MS, enabled: canReadJobs },
    ),
  );
  const agents = createQuery(() => appQueries.runners(workspaceId ?? ''));
  const since = $derived(workspaceId ? visitSince(workspaceId) : null);
  const attention = createQuery(() => attentionQueries.list(workspaceId, projectId(), since));
  const attentionLocked = $derived(
    attention.isError && ScyllaError.from(attention.error).code === 'PERMISSION_DENIED',
  );

  const allPipelines = $derived(pipelinesById(summaries.data?.items ?? []));
  const inScope = (pipelineId: string) => {
    const id = projectId();
    return !id || allPipelines.get(pipelineId)?.projectId === id;
  };
  const scoped = (jobs: readonly JobEntity[] | undefined) =>
    (jobs ?? []).filter(job => inScope(job.pipelineId));

  const pipelineItems = $derived(
    (summaries.data?.items ?? []).filter(item => !projectId() || item.projectId === projectId()),
  );
  const liveJobs = $derived(scoped(live.data));
  const endedJobs = $derived(scoped(ended.data));
  const dayJobs = $derived(scoped(day.data));

  return {
    get canReadJobs() {
      return canReadJobs;
    },
    get canReadPipelines() {
      return canReadPipelines;
    },
    /** `false` without the right to list the agents: the query does not run. */
    get canReadAgents() {
      return !agents.isPending || agents.fetchStatus !== 'idle';
    },
    stats,
    summaries,
    /** The items of "Needs you" (ListAttentionItems), of the scope. */
    attention,
    /** The last visit before this one, for "new". */
    get since() {
      return since;
    },
    get attentionLocked() {
      return attentionLocked;
    },
    live,
    ended,
    day,
    agents,
    /** The summaries of the scope, failing first. */
    get pipelineItems() {
      return pipelineItems;
    },
    get liveJobs() {
      return liveJobs;
    },
    get endedJobs() {
      return endedJobs;
    },
    /** The jobs created in the last 24 hours, newest first. */
    get dayJobs() {
      return dayJobs;
    },
    /** Every summary by pipeline id, out of the scope too: the names of the jobs. */
    get pipelines() {
      return allPipelines;
    },
  };
};

export type DashboardWidgets = ReturnType<typeof createDashboardWidgets>;
