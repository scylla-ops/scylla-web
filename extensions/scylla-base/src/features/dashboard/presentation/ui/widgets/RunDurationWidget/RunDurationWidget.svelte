<script lang="ts">
  import type { Snippet } from 'svelte';
  import TimerIcon from '@lucide/svelte/icons/timer';
  import { ChartLegendItem, ChartSegment, Widget, deltaTrend, type LucideIcon, type WidgetSize } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import { widgetMessages } from '@base/features/dashboard/presentation/messages/widgets.messages.ts';
  import { durationMessages as messages } from '@base/features/dashboard/presentation/messages/duration.messages.ts';
  import { rateMessages } from '@base/features/dashboard/presentation/messages/rate.messages.ts';
  import {
    bucketAxis,
    durationBars,
    durationChange,
    durationText,
    periodMeta,
    type ChangeView,
  } from '@base/features/dashboard/presentation/presenters/job-figures.presenter.ts';
  import type { DashboardPeriodState } from '@base/features/dashboard/presentation/ui/dashboard-period.state.svelte.ts';
  import type { DashboardWidgets } from '../dashboard-widgets.state.svelte.ts';
  import BucketAxis from '../parts/BucketAxis.svelte';
  import ChangeBadge from '../parts/ChangeBadge.svelte';
  import { viewPermissionName } from '@base/features/dashboard/presentation/presenters/permission-name.presenter.ts';
  import WidgetBody from '../parts/WidgetBody.svelte';

  interface Props {
    widgets: DashboardWidgets;
    period: DashboardPeriodState;
    size?: WidgetSize;
    /** The controls of the edit mode, over the card. */
    editing?: Snippet;
  }

  let { widgets, period, size = 'm', editing }: Props = $props();

  const SLOW_ROWS = 4;
  const MINUS = '−';

  const stats = $derived(widgets.stats.data);
  const totals = $derived(stats?.totals);
  const previous = $derived(stats?.previous ?? null);
  const bars = $derived(durationBars(stats?.buckets ?? []));
  const axis = $derived(
    bucketAxis(stats?.buckets ?? [], period.rangeAt().bucket, period.timeZone ?? 'UTC', period.rangeAt().to === null),
  );
  const sideBars = $derived(bars.slice(-10));
  const sideTop = $derived(Math.max(1, ...sideBars.map(bar => bar.p50)));
  const p50Change = $derived(durationChange(totals?.p50Duration ?? null, previous?.p50Duration ?? null));
  const p95Change = $derived(durationChange(totals?.p95Duration ?? null, previous?.p95Duration ?? null));
  const empty = $derived(!totals || totals.p50Duration === null);

  const secondsDelta = (now: number | null, before: number | null): ChangeView | null => {
    if (now === null || before === null) return null;
    const delta = Math.round(now - before);
    const label = delta === 0 ? '0 s' : `${delta > 0 ? '+' : MINUS}${durationText(Math.abs(delta))}`;
    return { label, ...deltaTrend(delta, 'down') };
  };

  const slowest = $derived(
    (widgets.slowPipelines.data?.groups ?? [])
      .filter(group => group.figures.p50Duration !== null)
      .slice(0, SLOW_ROWS)
      .map(group => ({
        id: group.id,
        name: widgets.pipelines.get(group.id)?.name ?? group.id.slice(-8),
        project: widgets.pipelines.get(group.id)?.projectName ?? '',
        p50: durationText(group.figures.p50Duration),
        change: secondsDelta(group.figures.p50Duration, group.previous?.p50Duration ?? null),
      })),
  );
</script>

{#snippet chart(className: string, withAxis: boolean)}
  <div class={cn('flex min-h-0 flex-col gap-1', className)}>
    <div class="flex min-h-0 flex-1 items-end gap-1" role="img" aria-label={t(messages.p50Median)}>
      {#each bars as bar (bar.start)}
        <div class="flex h-full min-w-0 flex-1 flex-col justify-end">
          {#if bar.p95 > bar.p50}<ChartSegment tone="muted" class="rounded-t-[3px]" style="height: {bar.p95 - bar.p50}%" />{/if}
          {#if bar.p50 > 0}<ChartSegment tone="info" class={cn(bar.p95 > bar.p50 ? 'rounded-b-[3px]' : 'rounded-[3px]')} style="height: {bar.p50}%" />{/if}
        </div>
      {/each}
    </div>
    {#if withAxis && axis}<BucketAxis labels={axis} />{/if}
  </div>
{/snippet}

{#snippet aside()}
  <span>{t(messages.p50)}</span>
{/snippet}

{#snippet side()}
  <div class="flex h-[34px] w-[60px] items-end gap-0.5" aria-hidden="true">
    {#each sideBars as bar (bar.start)}
      <ChartSegment tone="info" class="w-1 shrink-0 rounded-[1px]" style="height: {Math.max(8, (bar.p50 / sideTop) * 100)}%" />
    {/each}
  </div>
{/snippet}

<Widget
  {size}
  {editing}
  title={t(widgetMessages.runDuration)}
  icon={TimerIcon as LucideIcon}
  meta={size === 'xs'
    ? undefined
    : size === 's'
      ? periodMeta(period.period)
      : t(messages.p50AndP95(periodMeta(period.period)))}
  aside={size === 'xs' ? aside : undefined}
  side={empty ? undefined : side}
>
  <WidgetBody
    {size}
    retrySeconds={60}
    permission={viewPermissionName('jobs')}
    locked={!widgets.canReadJobs}
    loading={widgets.stats.isPending}
    error={widgets.stats.isError}
    onRetry={() => void widgets.stats.refetch()}
    {empty}
    emptyTitle={t(widgetMessages.noJobsInPeriod)}
    emptyText={t(widgetMessages.noJobsInPeriodText)}
  >
    {#if totals}
      {#if size === 'xs'}
        <p data-part="run-duration" class="flex h-7 items-center gap-2">
          <span class="font-display text-xl font-medium tabular-nums">{durationText(totals.p50Duration)}</span>
          <ChangeBadge change={p50Change} />
        </p>
      {:else if size === 's'}
        <div data-part="run-duration" class="flex min-h-0 flex-1 flex-col gap-1">
          <p class="flex items-center gap-2">
            <span class="font-display text-[34px] leading-10 font-medium tabular-nums">{durationText(totals.p50Duration)}</span>
            <ChangeBadge change={p50Change} />
          </p>
          <p class="text-xs text-muted-foreground">{t(messages.p50p95(durationText(totals.p95Duration)))}</p>
          {@render chart('mt-2 flex-1', true)}
        </div>
      {:else if size === 'm'}
        <div data-part="run-duration" class="flex min-h-0 flex-1 gap-6">
          <div class="flex w-[171px] shrink-0 flex-col gap-3">
            <div class="flex flex-col gap-0.5">
              <span class="text-xs text-muted-foreground">{t(messages.p50Median)}</span>
              <p class="flex items-center gap-2">
                <span class="font-display text-[34px] leading-10 font-medium tabular-nums">{durationText(totals.p50Duration)}</span>
                <ChangeBadge change={p50Change} />
              </p>
            </div>
            <div class="flex flex-col gap-0.5">
              <span class="text-xs text-muted-foreground">{t(messages.p95)}</span>
              <p class="flex items-center gap-2">
                <span class="font-display text-xl font-medium tabular-nums">{durationText(totals.p95Duration)}</span>
                <ChangeBadge change={p95Change} />
              </p>
            </div>
          </div>
          {@render chart('flex-1', true)}
        </div>
      {:else}
        <div data-part="run-duration" class="flex min-h-0 flex-1 flex-col gap-3">
          <div class="flex items-end gap-6">
            <div class="flex flex-col gap-0.5">
              <span class="text-xs text-muted-foreground">{t(messages.p50Median)}</span>
              <p class="flex items-center gap-2">
                <span class="font-display text-[34px] leading-10 font-medium tabular-nums">{durationText(totals.p50Duration)}</span>
                <ChangeBadge change={p50Change} />
              </p>
            </div>
            <div class="flex flex-col gap-0.5">
              <span class="text-xs text-muted-foreground">{t(messages.p95)}</span>
              <p class="flex items-center gap-2">
                <span class="font-display text-xl font-medium tabular-nums">{durationText(totals.p95Duration)}</span>
                <ChangeBadge change={p95Change} />
              </p>
            </div>
            <span class="ml-auto pb-1 text-xs text-muted-foreground">{t(rateMessages.vsPrevious(periodMeta(period.period)))}</span>
          </div>
          {@render chart('h-[116px] shrink-0', true)}
          <div class="flex items-center gap-3">
            <ChartLegendItem tone="info" label={t(messages.legendMedian)} />
            <ChartLegendItem tone="muted" label={t(messages.legendUpTo)} />
          </div>
          {#if slowest.length > 0}
            <div class="flex flex-col gap-1.5">
              <p class="flex items-center text-xs text-muted-foreground">
                <span>{t(messages.slowest)}</span>
                <span class="ml-auto">{t(messages.p50Change)}</span>
              </p>
              <ul class="flex flex-col gap-1">
                {#each slowest as row (row.id)}
                  <li class="flex h-6 min-w-0 items-center gap-1.5">
                    <span class="truncate text-sm font-medium">{row.name}</span>
                    <span class="truncate text-xs text-muted-foreground">{row.project}</span>
                    <span class="ml-auto shrink-0 pl-2 text-xs font-medium tabular-nums">{row.p50}</span>
                    <span class="flex w-[72px] shrink-0 justify-end"><ChangeBadge change={row.change} /></span>
                  </li>
                {/each}
              </ul>
            </div>
          {/if}
        </div>
      {/if}
    {/if}
  </WidgetBody>
</Widget>
