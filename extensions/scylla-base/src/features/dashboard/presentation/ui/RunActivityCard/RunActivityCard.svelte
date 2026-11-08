<script lang="ts">
  import ActivityIcon from '@lucide/svelte/icons/activity';
  import { StatusShape, type StatusState } from '@scylla/ui';
  import { Card, CardContent, CardHeader, CardTitle, Skeleton } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { getRelativeTime } from '@shared/utils/date-utils.ts';
  import type { JobsSummary } from '@base/features/jobs';
  import { dashboardMessages } from '@base/features/dashboard/presentation/messages/dashboard.messages.ts';

  interface Props {
    summary: JobsSummary;
    /** Can exceed the summarized window. */
    totalRuns: number;
    /** The summary covers only the latest page of runs. */
    truncated: boolean;
    loading: boolean;
  }

  let { summary, totalRuns, truncated, loading }: Props = $props();

  const inFlight = $derived(summary.pending + summary.running);

  const outcomes = $derived<{ state: StatusState; label: string; value: number }[]>([
    { state: 'success', label: t(dashboardMessages.completed), value: summary.completed },
    { state: 'failed', label: t(dashboardMessages.failed), value: summary.failed },
    { state: 'cancelled', label: t(dashboardMessages.cancelled), value: summary.cancelled },
    { state: 'orphaned', label: t(dashboardMessages.orphaned), value: summary.orphaned },
  ]);
</script>

<!-- Computed over the latest window (no backend aggregate): the card says when it is partial. -->
<Card class="py-5">
  <CardHeader class="px-5 pb-0">
    <CardTitle class="flex items-center justify-between text-base">
      <span class="flex items-center gap-2">
        <ActivityIcon class="h-4 w-4 text-primary" />
        {t(dashboardMessages.runActivity)}
      </span>
      {#if !loading && inFlight > 0}
        <span class="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
          <StatusShape state="running" label={t(dashboardMessages.inProgress(inFlight))} size={16} />
          <span aria-hidden="true">{t(dashboardMessages.inProgress(inFlight))}</span>
        </span>
      {/if}
    </CardTitle>
  </CardHeader>

  <CardContent class="px-5 pb-0 pt-4">
    {#if loading}
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {#each { length: 4 } as _, index (index)}
          <Skeleton class="h-10 w-full" />
        {/each}
      </div>
    {:else if summary.total === 0}
      <p class="text-sm text-muted-foreground">{t(dashboardMessages.noRunYet)}</p>
    {:else}
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {#each outcomes as outcome (outcome.state)}
          <div class="flex items-center gap-2">
            <StatusShape state={outcome.state} label={outcome.label} size={24} />
            <div class="min-w-0">
              <p class="text-lg font-semibold leading-none tabular-nums">{outcome.value}</p>
              <p class="truncate text-xs text-muted-foreground mt-0.5">{outcome.label}</p>
            </div>
          </div>
        {/each}
      </div>

      <p class="mt-4 text-xs text-muted-foreground">
        {#if summary.lastRunAt}
          {t(dashboardMessages.lastRun(getRelativeTime(summary.lastRunAt)))} ·
        {/if}
        {truncated
          ? t(dashboardMessages.overWindow(summary.total, totalRuns))
          : t(dashboardMessages.overAll(summary.total))}
      </p>
    {/if}
  </CardContent>
</Card>
