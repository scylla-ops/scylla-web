<script lang="ts">
  import type { Snippet } from 'svelte';
  import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
  import { Card, Skeleton } from '@scylla/ui/primitives';
  import { activeLocale, t } from '@scylla/ui/i18n';
  import {
    successRateOf,
    type AgentsSummary,
  } from '@base/features/agents/domain/structs/agents-summary.struct.ts';
  import { formatPercent } from '@base/features/agents/presentation/presenters/agent-format.presenter.ts';
  import { agentsPageMessages as messages } from '@base/features/agents/presentation/messages/agents-page.messages.ts';

  interface Props {
    summary: AgentsSummary;
    canReadStats: boolean;
    /** Some stats are still on their way: no partial sum. */
    statsLoading: boolean;
    /** The agents whose stats failed. */
    statsFailed: number;
  }

  let { summary, canReadStats, statsLoading, statsFailed }: Props = $props();

  const attention = $derived(summary.offline + summary.never);
  const successRate = $derived(successRateOf(summary.outcomes));

  const runningSub = $derived(
    summary.runningNames.length
      ? summary.runningNames.join(', ')
      : summary.online > 0
        ? t(messages.nothingRuns)
        : t(messages.noAgentOnline),
  );

  const jobsValue = $derived(
    !canReadStats || statsLoading ? null : String(summary.outcomes.total),
  );
  const jobsSub = $derived(
    !canReadStats
      ? t(messages.statsHidden)
      : statsLoading
        ? ''
        : successRate === null
          ? t(messages.noJobYet)
          : t(messages.succeeded(formatPercent(successRate, activeLocale()))),
  );
</script>

{#snippet cell(label: string, value: string | null, sub: string, marker?: Snippet, note?: string)}
  <div class="flex min-w-0 flex-col gap-2 px-5 py-4">
    <span class="text-xs font-medium text-muted-foreground">{label}</span>
    <span class="flex items-center gap-2 text-xl font-semibold leading-none tabular-nums">
      {#if marker}
        <span class="flex size-3.5 shrink-0 items-center justify-center" aria-hidden="true">
          {@render marker()}
        </span>
      {/if}
      {#if value === null}
        <Skeleton class="h-5 w-12" />
      {:else}
        {value}
      {/if}
    </span>
    <span class="truncate text-xs text-muted-foreground" title={sub}>{sub}</span>
    {#if note}
      <span class="text-[11px] text-warning">{note}</span>
    {/if}
  </div>
{/snippet}

{#snippet onlineDot()}
  <span class="size-2 rounded-full bg-success"></span>
{/snippet}

{#snippet runningDot()}
  <span class="size-2 rounded-full bg-info ring-[3px] ring-info/25"></span>
{/snippet}

{#snippet warningIcon()}
  <TriangleAlertIcon class="size-3.5 text-warning" />
{/snippet}

<Card
  class="grid grid-cols-2 gap-0 divide-border py-0 md:grid-cols-4 md:divide-x [&>*:nth-child(n+3)]:border-t md:[&>*:nth-child(n+3)]:border-t-0"
>
  {@render cell(
    t(messages.online),
    t(messages.onlineOf(summary.online, summary.total)),
    t(messages.agentsRunning(summary.running)),
    onlineDot,
  )}
  {@render cell(
    t(messages.runningNow),
    t(messages.jobCount(summary.runningJobs)),
    runningSub,
    runningDot,
  )}
  {@render cell(
    t(messages.needsAttention),
    String(attention),
    t(messages.attentionDetail(summary.offline, summary.never)),
    attention > 0 ? warningIcon : undefined,
  )}
  {@render cell(
    t(messages.finishedLast30Days),
    canReadStats ? jobsValue : '–',
    jobsSub,
    undefined,
    canReadStats && !statsLoading && statsFailed > 0 ? t(messages.partial(statsFailed)) : undefined,
  )}
</Card>
