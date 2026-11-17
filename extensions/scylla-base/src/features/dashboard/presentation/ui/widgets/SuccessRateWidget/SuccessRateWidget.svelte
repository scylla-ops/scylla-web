<script lang="ts">
  import type { Snippet } from 'svelte';
  import GaugeIcon from '@lucide/svelte/icons/gauge';
  import { ChartLegendItem, ChartRing, ChartSegment, Widget, type WidgetSize, type LucideIcon } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { decidedJobs, successRate, successRateChange } from '@base/features/jobs';
  import { widgetMessages as messages } from '@base/features/dashboard/presentation/messages/widgets.messages.ts';
  import {
    bucketAxis,
    bucketLabel,
    outcomeBars,
    periodMeta,
    rateChange,
    rateText,
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
    size?: WidgetSize;
    /** The controls of the edit mode, over the card. */
    editing?: Snippet;
  }

  let { widgets, period, size = 'm', editing }: Props = $props();

  const stats = $derived(widgets.stats.data);
  const outcomes = $derived(stats?.totals.outcomes);
  const rate = $derived(outcomes ? successRate(outcomes) : null);
  const change = $derived(
    outcomes && stats?.previous ? rateChange(successRateChange(outcomes, stats.previous.outcomes)) : null,
  );
  const bars = $derived(outcomeBars(stats?.buckets ?? []));
  const axis = $derived(
    bucketAxis(
      stats?.buckets ?? [],
      period.rangeAt().bucket,
      period.timeZone ?? 'UTC',
      period.rangeAt().to === null,
    ),
  );
  const empty = $derived(!outcomes || (decidedJobs(outcomes) === 0 && outcomes.cancelled === 0));
</script>

<Widget
  {size}
  {editing}
  title={t(messages.successRate)}
  icon={GaugeIcon as LucideIcon}
  meta={periodMeta(period.period)}
>
  <WidgetBody
    {size}
    locked={!widgets.canReadJobs}
    loading={widgets.stats.isPending}
    error={widgets.stats.isError}
    onRetry={() => void widgets.stats.refetch()}
    {empty}
    emptyTitle={t(messages.noJobsInPeriod)}
    emptyText={t(messages.noJobsInPeriodText)}
  >
    {#if outcomes}
      <div class="flex min-h-0 flex-1 gap-4">
        <div class="flex shrink-0 flex-col justify-between gap-2">
          <div class="flex items-center gap-3">
            <ChartRing
              arcs={[
                { value: outcomes.completed, tone: 'passed' },
                { value: outcomes.failed, tone: 'failed' },
                { value: outcomes.orphaned, tone: 'canceled' },
              ]}
              total={decidedJobs(outcomes)}
              value={rateText(rate)}
              label={t(messages.successRateLabel(rateText(rate)))}
            />
            <div class="flex flex-col gap-1">
              <ChartLegendItem tone="passed" label={t(messages.completed)} value={outcomes.completed} />
              <ChartLegendItem tone="failed" label={t(messages.failed)} value={outcomes.failed} />
              <ChartLegendItem tone="canceled" label={t(messages.orphaned)} value={outcomes.orphaned} />
              <span class="text-xs text-muted-foreground">
                {t(messages.cancelledApart(outcomes.cancelled))}
              </span>
            </div>
          </div>
          {#if change}
            <div class="flex items-center gap-2 text-xs text-muted-foreground">
              <ChangeBadge {change} />
              <span>{t(messages.vsPreviousPeriod)}</span>
            </div>
          {/if}
        </div>
        <div class="hidden min-w-0 flex-1 flex-col gap-1 @3xl:flex">
          <div class="flex min-h-0 flex-1 items-end gap-0.5">
            {#each bars as bar, index (bar.start)}
              {@const figures = stats?.buckets[index]?.figures.outcomes}
              <BarTip class="flex h-full min-w-0 flex-1 flex-col-reverse gap-px" top={bar.completed + bar.failed + bar.orphaned}>
                {#if bar.completed > 0}<ChartSegment tone="passed" style="height: {bar.completed}%" />{/if}
                {#if bar.failed > 0}<ChartSegment tone="failed" style="height: {bar.failed}%" />{/if}
                {#if bar.orphaned > 0}<ChartSegment tone="canceled" style="height: {bar.orphaned}%" />{/if}
                {#snippet tip()}
                  <span class="font-medium">{bucketLabel(bar.start, period.rangeAt().bucket, period.timeZone ?? 'UTC')}</span>
                  {#if figures}
                    <ChartLegendItem tone="passed" label={t(messages.completed)} value={figures.completed} />
                    <ChartLegendItem tone="failed" label={t(messages.failed)} value={figures.failed} />
                    <ChartLegendItem tone="canceled" label={t(messages.orphaned)} value={figures.orphaned} />
                    {#if figures.cancelled}
                      <span class="text-muted-foreground">{t(messages.cancelledApart(figures.cancelled))}</span>
                    {/if}
                  {/if}
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
