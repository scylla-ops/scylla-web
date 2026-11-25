<script lang="ts">
  import type { Snippet } from 'svelte';
  import ChartColumnIcon from '@lucide/svelte/icons/chart-column';
  import { ChartDot, ChartLegendItem, ChartSegment, Widget, type LucideIcon, type WidgetSize } from '@scylla/ui';
  import { formatNumber, t } from '@scylla/ui/i18n';
  import { widgetMessages } from '@base/features/dashboard/presentation/messages/widgets.messages.ts';
  import { viewMessages as messages } from '@base/features/dashboard/presentation/messages/widgets-view.messages.ts';
  import {
    bucketAxis,
    bucketHint,
    bucketLabel,
    periodMeta,
  } from '@base/features/dashboard/presentation/presenters/job-figures.presenter.ts';
  import {
    countChange,
    countText,
    perBucketText,
  } from '@base/features/dashboard/presentation/presenters/view-figures.presenter.ts';
  import type { DashboardPeriodState } from '@base/features/dashboard/presentation/ui/dashboard-period.state.svelte.ts';
  import type { DashboardWidgets } from '../dashboard-widgets.state.svelte.ts';
  import BarTip from '../parts/BarTip.svelte';
  import BucketAxis from '../parts/BucketAxis.svelte';
  import ChangeBadge from '../parts/ChangeBadge.svelte';
  import { viewPermissionName } from '@base/features/dashboard/presentation/presenters/permission-name.presenter.ts';
  import WidgetBody from '../parts/WidgetBody.svelte';
  import WidgetLink from '../parts/WidgetLink.svelte';

  interface Props {
    widgets: DashboardWidgets;
    period: DashboardPeriodState;
    size?: WidgetSize;
    /** The controls of the edit mode, over the card. */
    editing?: Snippet;
  }

  let { widgets, period, size = 'm', editing }: Props = $props();

  const TITLES = {
    hour: messages.runsPerHour,
    day: messages.runsPerDay,
    week: messages.runsPerWeek,
  } as const;

  const stats = $derived(widgets.stats.data);
  const bucket = $derived(period.rangeAt().bucket);
  const total = $derived(stats?.totals.created ?? 0);
  const change = $derived(stats ? countChange(total, stats.previous?.created ?? null) : null);
  const UNITS = {
    hour: messages.perHourUnit,
    day: messages.perDayUnit,
    week: messages.perWeekUnit,
  } as const;

  const outcomes = $derived(stats?.totals.outcomes);
  const mean = $derived(
    stats?.buckets.length
      ? formatNumber(total / stats.buckets.length, {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        })
      : '0',
  );
  const peak = $derived(
    (stats?.buckets ?? []).reduce<{ start: string; count: number } | null>(
      (best, item) =>
        item.figures.created > (best?.count ?? 0) ? { start: item.start, count: item.figures.created } : best,
      null,
    ),
  );
  const peakHref = $derived(peak ? period.bucketHref(peak.start, bucket) : null);
  const axis = $derived(
    bucketAxis(stats?.buckets ?? [], bucket, period.timeZone ?? 'UTC', period.rangeAt().to === null),
  );
  const highest = $derived(Math.max(1, ...(stats?.buckets ?? []).map(item => item.figures.created)));
  const bars = $derived(
    (stats?.buckets ?? []).map(item => {
      const { completed, failed, cancelled, orphaned } = item.figures.outcomes;
      const scale = (value: number) => (value / highest) * 100;
      return {
        start: item.start,
        outcomes: item.figures.outcomes,
        completed: scale(completed),
        failed: scale(failed),
        other: scale(cancelled + orphaned),
      };
    }),
  );
</script>

{#snippet aside()}
  <span class="flex items-center gap-1.5"><ChartDot tone="passed" />{t(widgetMessages.completedLower)}</span>
  <span class="flex items-center gap-1.5"><ChartDot tone="failed" />{t(widgetMessages.failedLower)}</span>
  <span class="flex items-center gap-1.5"><ChartDot tone="canceled" />{t(widgetMessages.cancelled)}</span>
{/snippet}

{#snippet barChart(className: string)}
      <div class={className}>
        {#each bars as bar (bar.start)}
          <BarTip
            class="flex h-full min-w-0 flex-1 flex-col-reverse gap-0.5"
            top={bar.completed + bar.failed + bar.other}
            href={period.bucketHref(bar.start, bucket)}
            hint={bucketHint(bar.start, bucket, period.timeZone ?? 'UTC')}
          >
            {#if bar.completed > 0}<ChartSegment tone="passed" class="rounded-[3px]" style="height: {bar.completed}%" />{/if}
            {#if bar.failed > 0}<ChartSegment tone="failed" class="rounded-[3px]" style="height: {bar.failed}%" />{/if}
            {#if bar.other > 0}<ChartSegment tone="canceled" class="rounded-[3px]" style="height: {bar.other}%" />{/if}
            {#snippet tip()}
              <span class="font-medium">{bucketLabel(bar.start, bucket, period.timeZone ?? 'UTC')}</span>
              <ChartLegendItem tone="passed" label={t(widgetMessages.completed)} value={bar.outcomes.completed} />
              <ChartLegendItem tone="failed" label={t(widgetMessages.failed)} value={bar.outcomes.failed} />
              <ChartLegendItem tone="canceled" label={t(widgetMessages.orphaned)} value={bar.outcomes.orphaned} />
              <ChartLegendItem tone="canceled" label={t(widgetMessages.cancelled)} value={bar.outcomes.cancelled} />
            {/snippet}
          </BarTip>
        {/each}
      </div>
{/snippet}

<Widget
  {size}
  {editing}
  title={t(TITLES[bucket])}
  icon={ChartColumnIcon as LucideIcon}
  meta={periodMeta(period.period)}
  aside={size === 'l' ? undefined : aside}
>
  <WidgetBody
    {size}
    retrySeconds={60}
    permission={viewPermissionName('jobs')}
    locked={!widgets.canReadJobs}
    loading={widgets.stats.isPending}
    error={widgets.stats.isError}
    onRetry={() => void widgets.stats.refetch()}
    empty={total === 0}
    emptyTitle={t(widgetMessages.noJobsInPeriod)}
    emptyText={t(widgetMessages.noJobsInPeriodText)}
  >
    {#if size === 'l'}
      <div data-part="runs" class="flex min-h-0 flex-1 flex-col gap-4">
        <dl class="flex min-w-0 gap-12">
          <div class="flex min-w-0 flex-col gap-1">
            <dt class="sr-only">{t(messages.runsUnit)}</dt>
            <dd class="text-[34px] leading-none font-medium tracking-tight tabular-nums">{countText(total)}</dd>
            <dd class="text-xs text-muted-foreground">{t(messages.runsUnit)}</dd>
          </div>
          <div class="flex min-w-0 flex-col gap-1">
            <dt class="sr-only">{t(UNITS[bucket])}</dt>
            <dd class="text-[34px] leading-none font-medium tracking-tight tabular-nums">{mean}</dd>
            <dd class="text-xs text-muted-foreground">{t(UNITS[bucket])}</dd>
          </div>
          {#if peak}
            <div class="flex min-w-0 flex-col gap-1">
              <dt class="sr-only">{t(messages.peakRuns(peak.count))}</dt>
              <dd class="truncate text-[34px] leading-none font-medium tracking-tight">
                <WidgetLink
                  link={peakHref ? { href: peakHref } : null}
                  title={bucketHint(peak.start, bucket, period.timeZone ?? 'UTC')}
                >
                  {bucketLabel(peak.start, bucket, period.timeZone ?? 'UTC')}
                </WidgetLink>
              </dd>
              <dd class="text-xs text-muted-foreground">{t(messages.peakRuns(peak.count))}</dd>
            </div>
          {/if}
        </dl>
        {@render barChart('flex min-h-0 flex-1 items-end gap-1.5')}
        <div class="flex flex-col gap-3">
          {#if axis}<BucketAxis labels={axis} />{/if}
          {#if outcomes}
            <div class="flex flex-wrap items-center gap-x-4 gap-y-1">
              <ChartLegendItem tone="passed" label={t(widgetMessages.completed)} value={outcomes.completed} />
              <ChartLegendItem tone="failed" label={t(widgetMessages.failed)} value={outcomes.failed} />
              <ChartLegendItem tone="canceled" label={t(widgetMessages.cancelledLegend)} value={outcomes.cancelled + outcomes.orphaned} />
            </div>
          {/if}
        </div>
      </div>
    {:else}
      <div data-part="runs" class="flex min-h-0 flex-1 items-end gap-6">
        <div class="flex min-w-32 shrink-0 flex-col gap-1">
          <p class="text-5xl font-medium tracking-tight tabular-nums">{countText(total)}</p>
          <p class="text-xs text-muted-foreground">{perBucketText(total, bars.length, bucket)}</p>
          <div class="mt-1"><ChangeBadge {change} /></div>
        </div>
        {@render barChart('flex h-full min-w-0 flex-1 items-end gap-1.5')}
      </div>
    {/if}
  </WidgetBody>
</Widget>
