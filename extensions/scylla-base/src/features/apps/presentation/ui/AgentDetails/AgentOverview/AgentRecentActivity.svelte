<script lang="ts">
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
  import { Button, Card, CardContent, CardHeader, CardTitle } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import {
    endedJobs,
    sumOutcomes,
    type AgentStats,
  } from '@base/features/apps/domain/structs/agent-stats.struct.ts';
  import {
    addDays,
    type Day,
  } from '@base/features/apps/domain/structs/stats-period.struct.ts';
  import { jobsChart } from '@base/features/apps/presentation/presenters/jobs-chart.presenter.ts';
  import { agentPageMessages as messages } from '@base/features/apps/presentation/messages/agent-page.messages.ts';
  import StackedBar from '../StackedBar.svelte';

  interface Props {
    /** The days since the agent joined. */
    stats: AgentStats;
    today: Day;
    joined: Day;
    disabled: Day | null;
    /** Opens the Activity tab. */
    onOpen: () => void;
  }

  let { stats, today, joined, disabled, onOpen }: Props = $props();

  const DAYS = 14;

  const chart = $derived(
    jobsChart({ period: { from: addDays(today, 1 - DAYS), to: today }, days: stats.days, joined, disabled }),
  );
  const total = $derived(endedJobs(sumOutcomes(chart.bars.map(bar => bar.outcomes))));
  const peak = $derived(Math.max(1, ...chart.bars.map(bar => bar.total)));
</script>

<!-- The jobs of the last 14 days, one bar each day, and a link to the whole activity. -->
<Card class="gap-4">
  <CardHeader class="flex flex-row items-center justify-between gap-3">
    <CardTitle><h2>{t(messages.lastDays(DAYS))}</h2></CardTitle>
    <Button variant="ghost" size="sm" class="-my-1" onclick={onOpen}>
      {t(messages.activityTab)}
      <ChevronRightIcon class="size-4" aria-hidden="true" />
    </Button>
  </CardHeader>
  <CardContent class="flex flex-col gap-2">
    <div
      class="flex h-12 items-end gap-1 border-b border-input"
      role="img"
      aria-label={t(messages.lastDaysLabel(total, DAYS))}
    >
      {#each chart.bars as bar (bar.from)}
        <span class="flex h-full min-w-0 flex-1 flex-col justify-end">
          {#if bar.total === 0}
            <span class="h-0.5 rounded-[1px] bg-muted-foreground/45"></span>
          {:else}
            <StackedBar
              outcomes={bar.outcomes}
              height={(bar.total / peak) * 100}
              class="rounded-t-[2px]"
            />
          {/if}
        </span>
      {/each}
    </div>
    <p class="text-xs text-muted-foreground">{t(messages.jobCount(total))}</p>
  </CardContent>
</Card>
