<script lang="ts">
  import { Card, Skeleton } from '@scylla/ui/primitives';
  import { activeLocale, t } from '@scylla/ui/i18n';
  import { getRelativeTime } from '@shared/utils/date-utils.ts';
  import type { AgentStats } from '@base/features/agents/domain/structs/agent.struct.ts';
  import type { Outcomes } from '@base/features/agents/domain/structs/agents-summary.struct.ts';
  import {
    formatDurationMs,
    formatPercent,
  } from '@base/features/agents/presentation/utils/agent-format.ts';
  import { agentDetailsMessages as messages } from './agent-details.messages.ts';

  interface Props {
    stats: AgentStats | undefined;
    /** The last 30 days. */
    outcomes: Outcomes | null;
    successRate: number | null;
    now: number;
  }

  let { stats, outcomes, successRate, now }: Props = $props();

  const lastRun = $derived.by(() => {
    void now;
    return stats?.lastRunAt
      ? t(messages.lastRunAgo(getRelativeTime(stats.lastRunAt)))
      : t(messages.noRunYet);
  });

  const cells = $derived([
    {
      key: 'jobs',
      label: t(messages.jobs30Days),
      value: outcomes ? String(outcomes.total) : '',
      sub: lastRun,
    },
    {
      key: 'success',
      label: t(messages.successRate),
      value: successRate === null ? '–' : formatPercent(successRate, activeLocale(), 1),
      sub:
        outcomes && outcomes.total > 0
          ? t(messages.completedOf(outcomes.completed, outcomes.total))
          : t(messages.nothingFinished),
    },
    {
      key: 'median',
      label: t(messages.medianDuration),
      value: stats?.medianDurationMs == null ? '–' : formatDurationMs(stats.medianDurationMs),
      sub: t(messages.startedToFinished),
    },
    {
      key: 'p95',
      label: t(messages.p95Duration),
      value: stats?.p95DurationMs == null ? '–' : formatDurationMs(stats.p95DurationMs),
      sub: t(messages.endSooner),
    },
  ]);
</script>

<Card
  class="grid grid-cols-2 gap-0 py-0 md:grid-cols-4 md:divide-x [&>*:nth-child(n+3)]:border-t md:[&>*:nth-child(n+3)]:border-t-0"
  role="group"
  aria-label={t(messages.keyNumbers)}
>
  {#each cells as cell (cell.key)}
    <div class="flex min-w-0 flex-col gap-2 px-5 py-4">
      <span class="text-xs font-medium text-muted-foreground">{cell.label}</span>
      {#if stats}
        <span class="text-xl font-semibold leading-none tabular-nums">{cell.value}</span>
      {:else}
        <Skeleton class="h-5 w-16" />
      {/if}
      <span class="truncate text-xs text-muted-foreground">{cell.sub}</span>
    </div>
  {/each}
</Card>
