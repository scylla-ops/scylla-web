<script lang="ts">
  import { Card, CardContent, CardHeader, CardTitle, Skeleton } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import type { AgentStats } from '@base/features/apps/domain/structs/agent-stats.struct.ts';
  import type { Day, StatsPeriod } from '@base/features/apps/domain/structs/stats-period.struct.ts';
  import { jobsCardText } from '@base/features/apps/presentation/presenters/jobs-card.presenter.ts';
  import { jobsChart } from '@base/features/apps/presentation/presenters/jobs-chart.presenter.ts';
  import { agentPageMessages as messages } from '@base/features/apps/presentation/messages/agent-page.messages.ts';
  import { JOB_SERIES } from '../job-series.registry.ts';
  import JobsChart from './JobsChart.svelte';

  interface Props {
    /** `undefined` while it loads. */
    stats: AgentStats | undefined;
    period: StatsPeriod;
    today: Day;
    /** The day of the creation of the agent. */
    joined: Day;
    /** The day that the agent was disabled. */
    disabled: Day | null;
    /** The agent never connected. */
    never: boolean;
    /** The page shows a timeline, with a window that the user can drag. */
    withTimeline: boolean;
  }

  let { stats, period, today, joined, disabled, never, withTimeline }: Props = $props();

  const chart = $derived(jobsChart({ period, days: stats?.days ?? [], joined, disabled }));
  const text = $derived(
    jobsCardText({ stats, chart, period, today, disabled, never, withTimeline }),
  );
  const legend = $derived(JOB_SERIES.filter(series => (stats?.outcomes[series.key] ?? 0) > 0));
</script>

<Card class="h-full">
  <CardHeader class="gap-0.5">
    <CardTitle>
      <h2>{t(chart.unit === 'week' ? messages.jobsPerWeek : messages.jobsPerDay)}</h2>
    </CardTitle>
    <p class="text-xs text-muted-foreground">{text.summary}</p>
  </CardHeader>
  <CardContent class="flex flex-1 flex-col gap-4">
    {#if stats}
      <JobsChart {chart} zones={text.zones} {today} label={text.label} />
    {:else}
      <Skeleton class="min-h-40 w-full flex-1" />
    {/if}
    {#if legend.length > 0}
      <ul class="flex flex-wrap gap-4 text-xs">
        {#each legend as series (series.key)}
          <li class="flex items-center gap-1.5">
            <span class="size-2 rounded-full {series.color}" aria-hidden="true"></span>
            {t(series.label)}
            <span class="text-muted-foreground tabular-nums">{stats?.outcomes[series.key]}</span>
          </li>
        {/each}
      </ul>
    {/if}
    {#if text.note}
      <p class="text-xs text-muted-foreground">{text.note}</p>
    {/if}
  </CardContent>
</Card>
