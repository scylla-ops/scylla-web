<script lang="ts">
  import type { Snippet } from 'svelte';
  import GaugeIcon from '@lucide/svelte/icons/gauge';
  import { ChartLegendItem, ChartRing, ChartSegment, Widget, type LucideIcon, type WidgetSize } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import { decidedJobs, successRate, successRateChange } from '@base/features/jobs';
  import { widgetMessages as messages } from '@base/features/dashboard/presentation/messages/widgets.messages.ts';
  import { rateMessages } from '@base/features/dashboard/presentation/messages/rate.messages.ts';
  import { periodMeta, rateChange, rateText } from '@base/features/dashboard/presentation/presenters/job-figures.presenter.ts';
  import { shortPeriod } from '@base/features/dashboard/presentation/presenters/view-figures.presenter.ts';
  import type { DashboardPeriodState } from '@base/features/dashboard/presentation/ui/dashboard-period.state.svelte.ts';
  import type { DashboardWidgets } from '../dashboard-widgets.state.svelte.ts';
  import ChangeBadge from '../parts/ChangeBadge.svelte';
  import DayBars from '../parts/DayBars.svelte';
  import WidgetBody from '../parts/WidgetBody.svelte';

  interface Props {
    widgets: DashboardWidgets;
    period: DashboardPeriodState;
    size?: WidgetSize;
    /** The controls of the edit mode, over the card. */
    editing?: Snippet;
  }

  let { widgets, period, size = 's', editing }: Props = $props();

  const FAILURE_ROWS = 4;

  const stats = $derived(widgets.stats.data);
  const outcomes = $derived(stats?.totals.outcomes);
  const rate = $derived(outcomes ? successRate(outcomes) : null);
  const previous = $derived(stats?.previous?.outcomes ?? null);
  const change = $derived(outcomes && previous ? rateChange(successRateChange(outcomes, previous)) : null);
  const empty = $derived(!outcomes || (decidedJobs(outcomes) === 0 && outcomes.cancelled === 0));
  const timeZone = $derived(period.timeZone ?? 'UTC');
  const range = $derived(period.rangeAt());

  const failures = $derived(
    (widgets.failingPipelines.data?.groups ?? [])
      .map(group => ({
        id: group.id,
        name: widgets.pipelines.get(group.id)?.name ?? group.id.slice(-8),
        project: widgets.pipelines.get(group.id)?.projectName ?? '',
        count: group.figures.outcomes.failed + group.figures.outcomes.orphaned,
      }))
      .filter(row => row.count > 0)
      .slice(0, FAILURE_ROWS),
  );
  const mostFailures = $derived(Math.max(1, ...failures.map(row => row.count)));
</script>

{#snippet ring(className: string, valueClass: string)}
  {#if outcomes}
    <div class="relative shrink-0">
      <ChartRing
        arcs={[
          { value: outcomes.completed, tone: 'passed' },
          { value: outcomes.failed, tone: 'failed' },
          { value: outcomes.orphaned, tone: 'canceled' },
        ]}
        total={decidedJobs(outcomes)}
        label={t(messages.successRateLabel(rateText(rate)))}
        class={className}
      />
      <span aria-hidden="true" class="pointer-events-none absolute inset-0 flex items-center justify-center font-display font-medium tabular-nums {valueClass}">
        {rateText(rate)}
      </span>
    </div>
  {/if}
{/snippet}

{#snippet legend()}
  {#if outcomes}
    <div class="flex min-w-0 flex-col gap-1">
      <ChartLegendItem tone="passed" label={t(messages.completed)} value={outcomes.completed} />
      <ChartLegendItem tone="failed" label={t(messages.failed)} value={outcomes.failed} />
      <ChartLegendItem tone="canceled" label={t(messages.orphaned)} value={outcomes.orphaned} />
      {#if outcomes.cancelled > 0}
        <span class="text-xs text-muted-foreground">{t(rateMessages.cancelledApart(outcomes.cancelled))}</span>
      {/if}
    </div>
  {/if}
{/snippet}

{#snippet changeLine(className: string)}
  {#if change}
    <div class={cn('flex items-center gap-2 text-xs text-muted-foreground', className)}>
      <ChangeBadge {change} />
      <span>{t(rateMessages.vsPrevious(periodMeta(period.period)))}</span>
    </div>
  {/if}
{/snippet}

{#snippet aside()}
  <span>{shortPeriod(period.period)}</span>
{/snippet}

{#snippet side()}
  {#if outcomes}
    <ChartRing
      arcs={[
        { value: outcomes.completed, tone: 'passed' },
        { value: outcomes.failed, tone: 'failed' },
        { value: outcomes.orphaned, tone: 'canceled' },
      ]}
      total={decidedJobs(outcomes)}
      label={t(messages.successRateLabel(rateText(rate)))}
      size="sm"
    />
  {/if}
{/snippet}

<Widget
  {size}
  {editing}
  title={t(messages.successRate)}
  icon={GaugeIcon as LucideIcon}
  meta={size === 'xs' ? undefined : periodMeta(period.period)}
  aside={size === 'xs' ? aside : undefined}
  side={empty ? undefined : side}
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
    {#if size === 'xs'}
      <p data-part="success-rate" class="flex h-7 items-center gap-2">
        <span class="font-display text-xl font-medium tabular-nums">{rateText(rate)}</span>
        <ChangeBadge {change} />
      </p>
    {:else if size === 's'}
      <div data-part="success-rate" class="flex min-h-0 flex-1 flex-col justify-between gap-2">
        <div class="flex items-center gap-4">
          {@render ring('size-[100px]', 'text-2xl')}
          {@render legend()}
        </div>
        {@render changeLine('')}
      </div>
    {:else if size === 'm'}
      <div data-part="success-rate" class="flex min-h-0 flex-1 gap-5">
        <div class="flex shrink-0 flex-col justify-between gap-2">
          <div class="flex items-center gap-4">
            {@render ring('size-[118px]', 'text-[28px]')}
            {@render legend()}
          </div>
          {@render changeLine('')}
        </div>
        {#if stats}
          <DayBars class="flex-1" buckets={stats.buckets} bucket={range.bucket} {timeZone} endsNow={range.to === null} />
        {/if}
      </div>
    {:else}
      <div data-part="success-rate" class="flex min-h-0 flex-1 flex-col gap-4">
        <div class="flex items-center gap-4">
          {@render ring('size-24', 'text-2xl')}
          {@render legend()}
          {#if change}
            <div class="ml-auto flex flex-col items-end gap-1 text-xs text-muted-foreground">
              <ChangeBadge {change} />
              <span>{t(rateMessages.vsPrevious(periodMeta(period.period)))}</span>
            </div>
          {/if}
        </div>
        {#if stats}
          <DayBars class="h-[116px] shrink-0" buckets={stats.buckets} bucket={range.bucket} {timeZone} endsNow={range.to === null} />
        {/if}
        {#if failures.length > 0}
          <div class="flex flex-col gap-1.5">
            <p class="flex items-center text-xs text-muted-foreground">
              <span>{t(rateMessages.mostFailures)}</span>
              <span class="ml-auto">{t(rateMessages.failedOrphaned)}</span>
            </p>
            <ul class="flex flex-col gap-1">
              {#each failures as row (row.id)}
                <li class="flex h-5 items-center gap-3">
                  <span class="flex w-[170px] shrink-0 items-baseline gap-1.5 truncate">
                    <span class="truncate text-sm font-medium">{row.name}</span>
                    <span class="truncate text-xs text-muted-foreground">{row.project}</span>
                  </span>
                  <span class="flex h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                    <ChartSegment tone="failed" class="h-full rounded-full" style="width: {(row.count / mostFailures) * 100}%" />
                  </span>
                  <span class="w-6 shrink-0 text-right text-sm font-medium tabular-nums">{row.count}</span>
                </li>
              {/each}
            </ul>
          </div>
        {/if}
      </div>
    {/if}
  </WidgetBody>
</Widget>
