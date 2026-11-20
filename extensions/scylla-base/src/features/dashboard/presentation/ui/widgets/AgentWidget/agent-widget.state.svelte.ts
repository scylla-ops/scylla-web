import { createQuery } from '@scylla/core-sdk';
import { appQueries } from '@base/features/apps';
import { successRate } from '@base/features/jobs';
import { agentMetricsQueries } from '@base/features/dashboard/presentation/agent-metrics.queries.ts';
import {
  agentLoad,
  agentSlots,
  hostFacts,
  loadBars,
  recentTones,
} from '@base/features/dashboard/presentation/presenters/agent-widget.presenter.ts';
import { durationText, rateText } from '@base/features/dashboard/presentation/presenters/job-figures.presenter.ts';
import { currentInstant } from '@base/features/dashboard/presentation/presenters/zoned-day.presenter.ts';
import { liveJobs } from '@base/features/dashboard/presentation/presenters/widget-rows.presenter.ts';
import type { DashboardPeriodState } from '@base/features/dashboard/presentation/ui/dashboard-period.state.svelte.ts';
import type { DashboardWidgets } from '../dashboard-widgets.state.svelte.ts';

const RECENT_JOBS = 20;

const utcDay = (instant: Date): string => instant.toISOString().slice(0, 10);

export const createAgentWidget = (
  widgets: () => DashboardWidgets,
  period: () => DashboardPeriodState,
  target: () => string | undefined,
) => {
  const workspaceId = $derived(widgets().workspaceId ?? '');
  const agentId = $derived(target() ?? '');
  const agent = $derived(agentId ? widgets().agents.data?.find(item => item.id === agentId) : undefined);
  const days = $derived.by(() => {
    const range = period().rangeAt();
    return { from: utcDay(range.from), to: utcDay(range.to ?? currentInstant()) };
  });

  const stats = createQuery(() => appQueries.agentStatsOf(agentId, workspaceId, days));
  const jobs = createQuery(() => appQueries.jobs(workspaceId, agentId, !!agent && widgets().canReadJobs));
  const metrics = createQuery(() => agentMetricsQueries.lastDay(agentId || null, !!agent));

  const slots = $derived(agent ? agentSlots(agent) : []);
  const busy = $derived(slots.filter(state => state === 'busy').length);
  const load = $derived(agent ? agentLoad(agent) : { cpu: null, ram: null });
  const bars = $derived(loadBars(metrics.data?.buckets ?? [], agent?.host?.totalMemoryMb));
  const running = $derived(
    liveJobs((widgets().live.data ?? []).filter(job => job.agentId === agentId), widgets().pipelines, currentInstant().getTime()).running,
  );
  const figures = $derived.by(() => {
    const data = stats.data;
    if (!data) return null;
    const { completed, failed, cancelled, orphaned } = data.outcomes;
    return {
      jobs: completed + failed + cancelled + orphaned,
      success: rateText(successRate(data.outcomes)),
      median: durationText(data.medianMs === null ? null : data.medianMs / 1000),
      p95: durationText(data.p95Ms === null ? null : data.p95Ms / 1000),
    };
  });

  return {
    get agent() {
      return agent;
    },
    get unset() {
      return !agentId;
    },
    get gone() {
      return !!agentId && widgets().agents.isSuccess && !agent;
    },
    get slots() {
      return slots;
    },
    get busy() {
      return busy;
    },
    get load() {
      return load;
    },
    get bars() {
      return bars;
    },
    get running() {
      return running;
    },
    get figures() {
      return figures;
    },
    get facts() {
      return hostFacts(agent?.host ?? null);
    },
    get recent() {
      return recentTones(jobs.data ?? [], RECENT_JOBS);
    },
  };
};
