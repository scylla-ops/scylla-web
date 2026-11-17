<script lang="ts">
  import TimerIcon from '@lucide/svelte/icons/timer';
  import { ChartSegment, Widget, type LucideIcon } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { widgetMessages as messages } from '@base/features/dashboard/presentation/messages/widgets.messages.ts';
  import {
    bucketAxis,
    bucketLabel,
    durationBars,
    durationChange,
    durationText,
    periodMeta,
  } from '@base/features/dashboard/presentation/presenters/job-figures.presenter.ts';
  import type { DashboardPeriodState } from '@base/features/dashboard/presentation/ui/dashboard-period.state.svelte.ts';
  import type { DashboardWidgets } from '../dashboard-widgets.state.svelte.ts';
  import BarTip from '../parts/BarTip.svelte';
  import BucketAxis from '../parts/BucketAxis.svelte';
  import ChangeBadge from '../parts/ChangeBadge.svelte';
  import WidgetBody from '../parts/WidgetBody.svelte';

  interface Props {
    widgets: DashboardWidgets;
    period: DashboardPeriodState;
  }

  let { widgets, period }: Props = $props();

  const stats = $derived(widgets.stats.data);
  const totals = $derived(stats?.totals);
  const previous = $derived(stats?.previous ?? null);
  const bars = $derived(durationBars(stats?.buckets ?? []));
  const axis = $derived(
    bucketAxis(
      stats?.buckets ?? [],
      period.rangeAt().bucket,
      period.timeZone ?? 'UTC',
      period.rangeAt().to === null,
    ),
  );
</script>

<Widget
  size="m"
  title={t(messages.runDuration)}
  icon={TimerIcon as LucideIcon}
  meta={`${t(messages.p50AndP95)} · ${periodMeta(period.period)}`}
>
  <WidgetBody
    size="m"
    locked={!widgets.canReadJobs}
    loading={widgets.stats.isPending}
    error={widgets.stats.isError}
    onRetry={() => void widgets.stats.refetch()}
    empty={!totals || totals.p50Duration === null}
    emptyTitle={t(messages.noEndedJobsInPeriod)}
    emptyText={t(messages.noJobsInPeriodText)}
  >
    {#if totals}
      <div class="flex min-h-0 flex-1 gap-4">
        <div class="flex shrink-0 flex-col gap-3">
          <div class="flex flex-col">
            <span class="text-xs text-muted-foreground">{t(messages.p50Median)}</span>
            <div class="flex items-center gap-2">
              <span class="text-3xl leading-9 font-medium tabular-nums">
                {durationText(totals.p50Duration)}
              </span>
              <ChangeBadge change={durationChange(totals.p50Duration, previous?.p50Duration ?? null)} />
            </div>
          </div>
          <div class="flex flex-col">
            <span class="text-xs text-muted-foreground">{t(messages.p95)}</span>
            <div class="flex items-center gap-2">
              <span class="text-lg font-medium tabular-nums">{durationText(totals.p95Duration)}</span>
              <ChangeBadge change={durationChange(totals.p95Duration, previous?.p95Duration ?? null)} />
            </div>
          </div>
        </div>
        <div class="hidden min-w-0 flex-1 flex-col gap-1 @3xl:flex">
          <div class="flex min-h-0 flex-1 items-end gap-0.5">
            {#each bars as bar, index (bar.start)}
              {@const figures = stats?.buckets[index]?.figures}
              <BarTip class="relative flex h-full min-w-0 flex-1 flex-col justify-end">
                <ChartSegment tone="muted" class="absolute inset-x-0 bottom-0" style="height: {bar.p95}%" />
                <ChartSegment tone="info" class="relative" style="height: {bar.p50}%" />
                {#snippet tip()}
                  <span class="font-medium">{bucketLabel(bar.start, period.rangeAt().bucket, period.timeZone ?? 'UTC')}</span>
                  <span>{t(messages.p50Median)} {durationText(figures?.p50Duration ?? null)}</span>
                  <span class="text-muted-foreground">{t(messages.p95)} {durationText(figures?.p95Duration ?? null)}</span>
                {/snippet}
              </BarTip>
            {/each}
          </div>
          {#if axis}
            <BucketAxis labels={axis} />
          {/if}
        </div>
      </div>
    {/if}
  </WidgetBody>
</Widget>
