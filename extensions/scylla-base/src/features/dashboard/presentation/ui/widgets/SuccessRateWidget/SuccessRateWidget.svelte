<script lang="ts">
  import type { Snippet } from 'svelte';
  import ChartPieIcon from '@lucide/svelte/icons/chart-pie';
  import { ChartDot, ChartRing, ChartSegment, Widget, type LucideIcon, type WidgetSize } from '@scylla/ui';
  import { cn } from '@scylla/ui/utils';
  import { t } from '@scylla/ui/i18n';
  import { decidedJobs, successRate, successRateChange } from '@base/features/jobs';
  import { widgetMessages as messages } from '@base/features/dashboard/presentation/messages/widgets.messages.ts';
  import { periodMeta, rateChange, rateText } from '@base/features/dashboard/presentation/presenters/job-figures.presenter.ts';
  import {
    countText,
    outcomeShares,
    shortPeriod,
  } from '@base/features/dashboard/presentation/presenters/view-figures.presenter.ts';
  import type { DashboardPeriodState } from '@base/features/dashboard/presentation/ui/dashboard-period.state.svelte.ts';
  import type { DashboardWidgets } from '../dashboard-widgets.state.svelte.ts';
  import ChangeBadge from '../parts/ChangeBadge.svelte';
  import WidgetBody from '../parts/WidgetBody.svelte';

  interface Props {
    widgets: DashboardWidgets;
    period: DashboardPeriodState;
    size?: WidgetSize;
    /** The controls of the edit mode, over the card. */
    editing?: Snippet;
  }

  let { widgets, period, size = 's', editing }: Props = $props();

  const outcomes = $derived(widgets.stats.data?.totals.outcomes);
  const rate = $derived(outcomes ? successRate(outcomes) : null);
  const shares = $derived(outcomes ? outcomeShares(outcomes) : null);
  const previous = $derived(widgets.stats.data?.previous?.outcomes ?? null);
  const change = $derived.by(() => {
    const view = outcomes && previous ? rateChange(successRateChange(outcomes, previous)) : null;
    return view ? { ...view, label: `${view.label} ${t(messages.vsPreviousPeriod)}` } : null;
  });
  const ring = $derived(size === 'm' || size === 'l');
  const empty = $derived(!outcomes || (decidedJobs(outcomes) === 0 && outcomes.cancelled === 0));
</script>

{#snippet aside()}
  <span>{shortPeriod(period.period)}</span>
{/snippet}

<Widget
  {size}
  {editing}
  bare={size === 'xs'}
  title={t(messages.successRate)}
  icon={ChartPieIcon as LucideIcon}
  meta={ring ? periodMeta(period.period) : undefined}
  aside={ring ? undefined : aside}
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
    {#if outcomes && shares}
      {#if size === 'xs'}
        <div class="flex min-w-0 items-center gap-3">
          <ChartRing
            arcs={[
              { value: outcomes.completed, tone: 'passed' },
              { value: outcomes.failed, tone: 'failed' },
              { value: outcomes.orphaned, tone: 'canceled' },
            ]}
            total={decidedJobs(outcomes)}
            label={t(messages.successRateLabel(rateText(rate)))}
            size="sm"
            class="size-12"
          />
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm">{t(messages.successRate)}</p>
            <p class="font-mono text-xs text-muted-foreground">
              {countText(outcomes.completed)} / {countText(decidedJobs(outcomes))}
            </p>
          </div>
          <p class="text-3xl font-medium tracking-tight tabular-nums">{rateText(rate)}</p>
        </div>
      {:else if ring}
        {@const large = size === 'l'}
        <div data-part="ratio-ring" class={cn('flex min-h-0 flex-1 items-center', large ? 'gap-10' : 'gap-8')}>
          <div class="relative shrink-0">
            <ChartRing
              arcs={[
                { value: outcomes.completed, tone: 'passed' },
                { value: outcomes.failed, tone: 'failed' },
                { value: outcomes.orphaned, tone: 'canceled' },
              ]}
              total={decidedJobs(outcomes)}
              label={t(messages.successRateLabel(rateText(rate)))}
              class={large ? 'size-[260px]' : 'size-32'}
            />
            <div aria-hidden="true" class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1">
              <span class={cn('font-medium tracking-tight tabular-nums', large ? 'text-[56px] leading-none' : 'text-[28px] leading-none')}>
                {rateText(rate)}
              </span>
              {#if large}
                <span class="text-xs text-muted-foreground">{t(messages.ofFinishedRuns)}</span>
              {/if}
            </div>
          </div>
          <div class={cn('flex min-w-0 flex-col text-sm', large ? 'gap-4' : 'gap-3')}>
            <p class="flex items-center gap-2"><ChartDot tone="passed" /><span class="text-muted-foreground">{t(messages.completed)}</span><span class="font-medium tabular-nums">{outcomes.completed}</span></p>
            <p class="flex items-center gap-2"><ChartDot tone="failed" /><span class="text-muted-foreground">{t(messages.failed)}</span><span class="font-medium tabular-nums">{outcomes.failed}</span></p>
            <p class="flex items-center gap-2"><ChartDot tone="canceled" /><span class="text-muted-foreground">{t(messages.orphaned)}</span><span class="font-medium tabular-nums">{outcomes.orphaned}</span></p>
            {#if change}<div><ChangeBadge {change} /></div>{/if}
          </div>
        </div>
      {:else}
        <div class="mt-auto flex flex-col gap-3">
          <p class="text-6xl font-medium tracking-tight tabular-nums">{rateText(rate)}</p>
          <div class="flex h-1.5 w-full gap-0.5" aria-label={t(messages.successRateLabel(rateText(rate)))} role="img">
            {#if shares.completed > 0}<ChartSegment tone="passed" class="rounded-full" style="width: {shares.completed}%" />{/if}
            {#if shares.failed > 0}<ChartSegment tone="failed" class="rounded-full" style="width: {shares.failed}%" />{/if}
            {#if shares.orphaned > 0}<ChartSegment tone="canceled" class="rounded-full" style="width: {shares.orphaned}%" />{/if}
          </div>
          <div class="flex items-center gap-4 text-xs tabular-nums">
            <span class="flex items-center gap-1.5" title={t(messages.completed)}><ChartDot tone="passed" />{outcomes.completed}</span>
            <span class="flex items-center gap-1.5" title={t(messages.failed)}><ChartDot tone="failed" />{outcomes.failed}</span>
            <span class="flex items-center gap-1.5" title={t(messages.orphaned)}><ChartDot tone="canceled" />{outcomes.orphaned}</span>
          </div>
        </div>
      {/if}
    {/if}
  </WidgetBody>
</Widget>
