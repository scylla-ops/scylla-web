<script lang="ts">
  import ChartColumnIcon from '@lucide/svelte/icons/chart-column';
  import { SegmentedControl, type SegmentedOption } from '@scylla/ui';
  import { Button, Card, Skeleton } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { formatUtcDay } from '@shared/utils/date-utils.ts';
  import { endedJobs } from '@base/features/apps/domain/structs/agent-stats.struct.ts';
  import {
    PERIOD_PRESETS,
    type PeriodPreset,
  } from '@base/features/apps/domain/structs/stats-period.struct.ts';
  import { agentPageMessages as messages } from '@base/features/apps/presentation/messages/agent-page.messages.ts';
  import type { AgentStatsView } from '../agent-stats.state.svelte.ts';
  import AgentStatsRow from '../AgentStatsRow.svelte';
  import AgentTimeline from '../AgentTimeline/AgentTimeline.svelte';
  import JobsPerDay from '../JobsPerDay/JobsPerDay.svelte';

  interface Props {
    stats: AgentStatsView;
    /** The start of the newest job, if any. */
    lastRunAt: string | undefined;
    /** Opens the Jobs tab. */
    onShowJobs: () => void;
    /** The next step of an agent with no ended job. */
    emptyAction?: { label: string; onSelect: () => void };
  }

  let { stats, lastRunAt, onShowJobs, emptyAction }: Props = $props();

  const PRESET_LABELS = {
    '7d': messages.preset7d,
    '30d': messages.preset30d,
    '90d': messages.preset90d,
    all: messages.presetAll,
  };

  const presets = $derived(
    PERIOD_PRESETS.map(
      (value): SegmentedOption<PeriodPreset | ''> => ({ value, label: t(PRESET_LABELS[value]) }),
    ),
  );
  const timeline = $derived(stats.timeline);
  const total = $derived(timeline?.stats ? endedJobs(timeline.stats.outcomes) : 0);
</script>

{#if stats.level === 'none'}
  <!-- No ended job: one short block, with the next step. -->
  <Card class="items-center gap-3 px-6 py-8 text-center">
    <span
      class="flex size-10 items-center justify-center rounded-full bg-muted text-primary"
      aria-hidden="true"
    >
      <ChartColumnIcon class="size-5" />
    </span>
    <h2 class="text-base">{t(messages.noActivity)}</h2>
    <p class="max-w-md text-sm text-muted-foreground">{t(messages.noActivityBody)}</p>
    {#if emptyAction}
      <Button variant="outline" size="sm" onclick={emptyAction.onSelect}>
        {emptyAction.label}
      </Button>
    {/if}
  </Card>
{:else if timeline && !timeline.stats}
  <Skeleton class="h-[30rem] w-full rounded-xl" />
{:else if timeline && stats.level === 'line'}
  <!-- An agent that joined today: a chart of one day says nothing. -->
  <Card class="flex-row flex-wrap items-center justify-between gap-3 px-6 py-4">
    <p class="text-sm">{t(messages.activityToday(total))}</p>
    <Button variant="outline" size="sm" onclick={onShowJobs}>
      {t(messages.seeJobs(total))}
    </Button>
  </Card>
{:else if timeline}
  <Card class="gap-5 px-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex min-w-0 flex-col gap-0.5">
        <h2 class="text-base">{t(messages.activityTab)}</h2>
        <p class="text-xs text-muted-foreground">
          {stats.level === 'timeline'
            ? t(messages.timelineSince(formatUtcDay(timeline.bounds.from), total))
            : t(messages.activityShort(formatUtcDay(timeline.bounds.from)))}
        </p>
      </div>
      {#if stats.level === 'timeline'}
        <SegmentedControl
          size="sm"
          value={timeline.preset ?? ''}
          options={presets}
          onChange={value => value && stats.choose(value)}
          aria-label={t(messages.period)}
        />
      {/if}
    </div>
    {#if stats.level === 'timeline' && timeline.stats}
      <AgentTimeline
        bounds={timeline.bounds}
        stats={timeline.stats}
        period={stats.period}
        today={stats.today}
        disabled={stats.disabled}
        onChoose={stats.choose}
      />
    {/if}
    <AgentStatsRow stats={stats.stats} {lastRunAt} period={stats.period} today={stats.today} />
    <JobsPerDay
      stats={stats.stats}
      period={stats.period}
      today={stats.today}
      joined={stats.joined}
      disabled={stats.disabled}
      never={stats.never}
      withTimeline={stats.level === 'timeline'}
    />
  </Card>
{/if}
