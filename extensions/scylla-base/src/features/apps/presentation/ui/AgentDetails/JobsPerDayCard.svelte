<script lang="ts">
  import type { MessageDescriptor } from '@lingui/core';
  import { Card, CardContent, CardHeader, CardTitle } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { formatDay } from '@shared/utils/date-utils.ts';
  import {
    endedJobs,
    type AgentStats,
    type JobOutcomes,
  } from '@base/features/apps/domain/structs/agent-stats.struct.ts';
  import { agentPageMessages as messages } from '@base/features/apps/presentation/messages/agent-page.messages.ts';

  interface Props {
    stats: AgentStats;
  }

  let { stats }: Props = $props();

  const SERIES: readonly { key: keyof JobOutcomes; color: string; label: MessageDescriptor }[] = [
    { key: 'completed', color: 'bg-primary', label: messages.completed },
    { key: 'failed', color: 'bg-destructive', label: messages.failed },
    { key: 'cancelled', color: 'bg-muted-foreground', label: messages.cancelled },
    { key: 'orphaned', color: 'bg-chart-2', label: messages.orphaned },
  ];

  const max = $derived(Math.max(1, ...stats.days.map(day => endedJobs(day.outcomes))));
  const total = $derived(endedJobs(stats.outcomes));
</script>

<Card class="h-full">
  <CardHeader class="flex flex-row items-center justify-between">
    <CardTitle><h2>{t(messages.jobsPerDay)}</h2></CardTitle>
    <span class="text-xs text-muted-foreground">{t(messages.last30Days)}</span>
  </CardHeader>
  <CardContent class="flex flex-col gap-4">
    <div class="flex h-32 items-end gap-1" role="img" aria-label={t(messages.chartLabel(total))}>
      {#each stats.days as day (day.day)}
        {@const count = endedJobs(day.outcomes)}
        <div
          class="flex flex-1 flex-col-reverse overflow-hidden rounded-t-sm"
          style:height="{(count / max) * 100}%"
          title={t(messages.dayJobs(formatDay(day.day), count))}
        >
          {#each SERIES as series (series.key)}
            {#if day.outcomes[series.key] > 0}
              <div class={series.color} style:flex-grow={day.outcomes[series.key]}></div>
            {/if}
          {/each}
        </div>
      {/each}
    </div>
    <ul class="flex flex-wrap gap-4 text-xs">
      {#each SERIES as series (series.key)}
        <li class="flex items-center gap-1.5">
          <span class="size-2 rounded-full {series.color}" aria-hidden="true"></span>
          {t(series.label)}
        </li>
      {/each}
    </ul>
  </CardContent>
</Card>
