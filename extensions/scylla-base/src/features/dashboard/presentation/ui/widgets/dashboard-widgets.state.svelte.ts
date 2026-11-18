import { Permission, can } from '@platform/authz';
import { contextStore } from '@platform/context';
import { createQuery } from '@scylla/core-sdk';
import { toRune } from '@scylla/ui/stores';
import { appQueries } from '@base/features/apps';
import { jobQueries, type JobEntity, type PeriodScope } from '@base/features/jobs';
import { pipelineQueries } from '@base/features/pipeline';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import { attentionQueries, visitSince } from '@base/features/dashboard/presentation/attention.queries.ts';
import { slotUsageQueries } from '@base/features/dashboard/presentation/slot-usage.queries.ts';
import { schedulesQueries } from '@base/features/dashboard/presentation/schedules.queries.ts';
import { activityQueries } from '@base/features/dashboard/presentation/activity.queries.ts';
import { deliveryStatsQueries } from '@base/features/dashboard/presentation/delivery-stats.queries.ts';
import { vcsConnectionQueries } from '@base/features/integrations';
import type { DashboardPeriodState } from '@base/features/dashboard/presentation/ui/dashboard-period.state.svelte.ts';
import type { PeriodRange } from '@base/features/dashboard/presentation/presenters/period.presenter.ts';
import { currentInstant, dayIn, startOfDayIn } from '@base/features/dashboard/presentation/presenters/zoned-day.presenter.ts';
import { pipelinesById } from '@base/features/dashboard/presentation/presenters/widget-rows.presenter.ts';

/** The last jobs of each pipeline that the Pipelines widget shows. */
export const PIPELINE_RUNS = 20;

const LIVE_REFRESH_MS = 5_000;
const ACTIVITY_REFRESH_MS = 10_000;
const ACTIVITY_LIMIT = 20;
const LIVE_LIMIT = 50;
const DAY_LIMIT = 100;
const DAY_MS = 24 * 60 * 60 * 1000;
const GROUP_LIMIT = 5;

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
  const scopedProjects = () => (projectId() ? { projectIds: [projectId()!] } : {});
  const failingPipelines = createQuery(() =>
    jobQueries.stats(
      workspaceId,
      scope,
      { groupBy: 'pipeline', groupOrder: 'failed', groupLimit: GROUP_LIMIT, ...scopedProjects() },
      canReadJobs,
    ),
  );
  const slowPipelines = createQuery(() =>
    jobQueries.stats(
      workspaceId,
      scope,
      { compare: true, groupBy: 'pipeline', groupOrder: 'p50-duration', groupLimit: GROUP_LIMIT, ...scopedProjects() },
      canReadJobs,
    ),
  );
  const monthScope = $derived<PeriodScope<PeriodRange>>({
    scope: ['month', period.timeZone ?? 'UTC'],
    range: () => {
      const zone = period.timeZone ?? 'UTC';
      const first = `${dayIn(currentInstant(), zone).slice(0, 8)}01`;
      return { from: startOfDayIn(first, zone), to: null, bucket: 'day' };
    },
  });
  const monthMinutes = createQuery(() =>
    jobQueries.stats(
      workspaceId,
      monthScope,
      { groupBy: 'project', groupOrder: 'run-time', groupLimit: GROUP_LIMIT, ...scopedProjects() },
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
  const slotUsage = createQuery(() => slotUsageQueries.lastDay(workspaceId, can(Permission.LIST_AGENTS)));
  const since = $derived(workspaceId ? visitSince(workspaceId) : null);
  const attention = createQuery(() => attentionQueries.list(workspaceId, projectId(), since));
  const schedules = createQuery(() => schedulesQueries.list(workspaceId, projectId(), since, canReadPipelines));
  const deliveries = createQuery(() => deliveryStatsQueries.lastDay(workspaceId));
  const deliveriesLocked = $derived(
    deliveries.isError && ScyllaError.from(deliveries.error).code === 'PERMISSION_DENIED',
  );
  const connections = createQuery(() => vcsConnectionQueries.byWorkspace(workspaceId ?? '', !!workspaceId));
  const activityFeed = createQuery(() => activityQueries.feed(workspaceId, since));
  const activityLocked = $derived(
    activityFeed.isError && ScyllaError.from(activityFeed.error).code === 'PERMISSION_DENIED',
  );
  const schedulesLocked = $derived(
    schedules.isError && ScyllaError.from(schedules.error).code === 'PERMISSION_DENIED',
  );
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
    /** The run time of the calendar month by day, and by project. */
    monthMinutes,
    /** The stats by pipeline, the most failures first. */
    failingPipelines,
    /** The stats by pipeline, the slowest median first, with the previous period. */
    slowPipelines,
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
    /** The webhook deliveries of the last 24 hours (GetDeliveryStats). */
    deliveries,
    get deliveriesLocked() {
      return deliveriesLocked;
    },
    /** The Git connections of the workspace: their provider and account. */
    connections,
    /** The activity feed of the workspace (ActivityService.ListActivity). */
    activityFeed,
    get activityLocked() {
      return activityLocked;
    },
    /** The cron triggers, their next fires and their last fires. */
    schedules,
    get schedulesLocked() {
      return schedulesLocked;
    },
    /** The busy job slots of the last 24 hours, by hour. */
    slotUsage,
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
