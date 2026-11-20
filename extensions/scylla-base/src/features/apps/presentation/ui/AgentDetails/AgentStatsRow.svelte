<script lang="ts">
  import { t } from '@scylla/ui/i18n';
  import { formatDuration, getRelativeTime } from '@shared/utils/date-utils.ts';
  import {
    endedJobs,
    successRate,
    type AgentStats,
  } from '@base/features/apps/domain/structs/agent-stats.struct.ts';
  import {
    periodDays,
    type Day,
    type StatsPeriod,
  } from '@base/features/apps/domain/structs/stats-period.struct.ts';
  import { periodRange } from '@base/features/apps/presentation/presenters/period-range.presenter.ts';
  import { agentPageMessages as messages } from '@base/features/apps/presentation/messages/agent-page.messages.ts';

  interface Props {
    stats: AgentStats | undefined;
    /** The start of the newest job, if any. */
    lastRunAt: string | undefined;
    period: StatsPeriod;
    today: Day;
  }

  let { stats, lastRunAt, period, today }: Props = $props();

  const total = $derived(stats ? endedJobs(stats.outcomes) : 0);
  const rate = $derived(stats ? successRate(stats.outcomes) : null);
  const duration = (ms: number | null | undefined) =>
    ms === null || ms === undefined ? '–' : formatDuration(Math.round(ms / 1000));
</script>

<dl class="grid grid-cols-2 overflow-hidden rounded-xl border lg:grid-cols-4">
  <div class="flex flex-col gap-2 border-b p-5 lg:border-r lg:border-b-0">
    <dt class="text-xs text-muted-foreground">{t(messages.jobsOf(periodRange(period, today)))}</dt>
    <dd class="flex flex-col gap-2">
      <span class="text-xl font-medium">{stats ? total : '–'}</span>
      <span class="text-xs text-muted-foreground">
        {#if period.to !== today}
          {t(messages.dayCount(periodDays(period)))}
        {:else if lastRunAt}
          {t(messages.lastRun(getRelativeTime(lastRunAt)))}
        {:else}
          {t(messages.noRun)}
        {/if}
      </span>
    </dd>
  </div>
  <div class="flex flex-col gap-2 border-b border-l p-5 lg:border-b-0">
    <dt class="text-xs text-muted-foreground">{t(messages.successRate)}</dt>
    <dd class="flex flex-col gap-2">
      <span class="text-xl font-medium">{rate === null ? '–' : `${Math.round(rate * 100)}%`}</span>
      {#if stats}
        <span class="text-xs text-muted-foreground">
          {total > 0 ? t(messages.completedOf(stats.outcomes.completed, total)) : t(messages.noEndedJob)}
        </span>
      {/if}
    </dd>
  </div>
  <div class="flex flex-col gap-2 p-5 lg:border-x">
    <dt class="text-xs text-muted-foreground">{t(messages.median)}</dt>
    <dd class="flex flex-col gap-2">
      <span class="text-xl font-medium">{duration(stats?.medianMs)}</span>
      <span class="text-xs text-muted-foreground">{t(messages.startedToFinished)}</span>
    </dd>
  </div>
  <div class="flex flex-col gap-2 border-l p-5 lg:border-l-0">
    <dt class="text-xs text-muted-foreground">{t(messages.p95)}</dt>
    <dd class="flex flex-col gap-2">
      <span class="text-xl font-medium">{duration(stats?.p95Ms)}</span>
      <span class="text-xs text-muted-foreground">{t(messages.endSooner)}</span>
    </dd>
  </div>
</dl>
