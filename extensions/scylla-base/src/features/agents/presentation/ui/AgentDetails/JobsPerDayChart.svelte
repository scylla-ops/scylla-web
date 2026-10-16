<script lang="ts">
  import type { MessageDescriptor } from '@lingui/core';
  import { Card } from '@scylla/ui/primitives';
  import { activeLocale, t } from '@scylla/ui/i18n';
  import type { AgentStats } from '@base/features/agents/domain/structs/agent.struct.ts';
  import {
    axisTop,
    bucketTotal,
    dateOfDay,
    fillDays,
    type DayBucket,
  } from '@base/features/agents/presentation/daily-outcomes.calculator.ts';
  import { agentDetailsMessages as messages } from './agent-details.messages.ts';

  interface Props {
    stats: AgentStats;
    now: number;
  }

  let { stats, now }: Props = $props();

  type Segment = 'completed' | 'failed' | 'cancelled' | 'orphaned';

  const SEGMENTS: { key: Segment; label: MessageDescriptor; tone: string }[] = [
    { key: 'completed', label: messages.completed, tone: 'bg-success' },
    { key: 'failed', label: messages.failed, tone: 'bg-destructive' },
    { key: 'cancelled', label: messages.cancelled, tone: 'bg-muted-foreground/50' },
    { key: 'orphaned', label: messages.orphaned, tone: 'bg-warning' },
  ];

  const days = $derived(fillDays(stats.daily, undefined, new Date(now)));
  const top = $derived(axisTop(days));
  const empty = $derived(days.every(day => bucketTotal(day) === 0));

  const dayLabel = (day: DayBucket) =>
    dateOfDay(day.day).toLocaleDateString(activeLocale(), { month: 'short', day: 'numeric' });

  const xLabels = $derived([days[0], days[Math.floor(days.length / 2)], days[days.length - 1]]);

  const allTime = $derived([
    { key: 'jobs', count: stats.total, word: t(messages.allTimeJobs(stats.total)) },
    {
      key: 'completed',
      count: stats.completed,
      word: t(messages.allTimeCompleted(stats.completed)),
    },
    { key: 'failed', count: stats.failed, word: t(messages.allTimeFailed(stats.failed)) },
    {
      key: 'cancelled',
      count: stats.cancelled,
      word: t(messages.allTimeCancelled(stats.cancelled)),
    },
    { key: 'orphaned', count: stats.orphaned, word: t(messages.allTimeOrphaned(stats.orphaned)) },
    { key: 'running', count: stats.running, word: t(messages.allTimeRunning) },
    { key: 'pending', count: stats.pending, word: t(messages.allTimePending) },
  ]);
</script>

<Card class="gap-4 px-5 py-5">
  <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
    <div class="flex flex-col gap-1">
      <h2 class="text-sm font-semibold">{t(messages.jobsPerDay)}</h2>
      <p class="text-xs text-muted-foreground">{t(messages.last30ByCreationDay)}</p>
    </div>
    <ul class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {#each SEGMENTS as segment (segment.key)}
        <li class="flex items-center gap-1.5">
          <span class="size-2 rounded-sm {segment.tone}" aria-hidden="true"></span>
          {t(segment.label)}
        </li>
      {/each}
    </ul>
  </div>

  {#if empty}
    <p class="flex h-[140px] items-center justify-center text-sm text-muted-foreground">
      {t(messages.noJobInWindow)}
    </p>
  {:else}
    <div class="flex gap-3">
      <div
        class="flex h-[120px] flex-col justify-between text-right text-[11px] leading-none text-muted-foreground tabular-nums"
        aria-hidden="true"
      >
        <span class="-translate-y-1/2">{top}</span>
        <span>{top / 2}</span>
        <span class="translate-y-1/2">0</span>
      </div>
      <div class="flex min-w-0 flex-1 flex-col gap-2">
        <div class="relative h-[120px]" role="img" aria-label={t(messages.chartLabel)}>
          <div class="pointer-events-none absolute inset-0 flex flex-col justify-between">
            <span class="border-t border-border/70"></span>
            <span class="border-t border-border/70"></span>
            <span class="border-t border-border"></span>
          </div>
          <div class="relative flex h-full items-end gap-[3px]">
            {#each days as day (day.day)}
              <div
                class="flex h-full flex-1 flex-col-reverse"
                title={t(
                  messages.dayDetail(
                    dayLabel(day),
                    day.completed,
                    day.failed,
                    day.cancelled,
                    day.orphaned,
                  ),
                )}
              >
                {#each SEGMENTS as segment (segment.key)}
                  {#if day[segment.key] > 0}
                    <span
                      class="w-full first:rounded-b-[1px] last:rounded-t-[2px] {segment.tone}"
                      style:height="{(day[segment.key] / top) * 100}%"
                    ></span>
                  {/if}
                {/each}
              </div>
            {/each}
          </div>
        </div>
        <div class="flex justify-between text-[11px] text-muted-foreground" aria-hidden="true">
          {#each xLabels as day (day.day)}
            <span>{dayLabel(day)}</span>
          {/each}
        </div>
      </div>
    </div>
  {/if}

  <div
    class="flex flex-wrap items-baseline gap-x-5 gap-y-1 border-t pt-4 text-sm text-muted-foreground"
  >
    <span class="text-xs">{t(messages.allTime)}</span>
    {#each allTime as item (item.key)}
      <span><span class="font-semibold text-foreground tabular-nums">{item.count}</span> {item.word}</span>
    {/each}
  </div>
</Card>
