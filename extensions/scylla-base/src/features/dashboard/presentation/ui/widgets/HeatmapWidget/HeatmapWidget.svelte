<script lang="ts">
  import type { Snippet } from 'svelte';
  import CalendarDaysIcon from '@lucide/svelte/icons/calendar-days';
  import { i18n } from '@lingui/core';
  import { ChartHeatCell, Widget, type LucideIcon, type WidgetSize } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import { heatmapMessages as messages } from '@base/features/dashboard/presentation/messages/heatmap.messages.ts';
  import {
    busiestCell,
    heatLevels,
    pairHours,
    weekdayNames,
    type HeatLevel,
  } from '@base/features/dashboard/presentation/presenters/heatmap.presenter.ts';
  import type { DashboardPeriodState } from '@base/features/dashboard/presentation/ui/dashboard-period.state.svelte.ts';
  import type { DashboardWidgets } from '../dashboard-widgets.state.svelte.ts';
  import WidgetBody from '../parts/WidgetBody.svelte';
  import { createHeatmap } from './heatmap.state.svelte.ts';

  interface Props {
    widgets: DashboardWidgets;
    period: DashboardPeriodState;
    size?: WidgetSize;
    editing?: Snippet;
  }

  let { widgets, period, size = 'm', editing }: Props = $props();

  const LEGEND: readonly HeatLevel[] = [1, 2, 3, 4];

  const heatmap = createHeatmap(() => widgets, () => period);
  const small = $derived(size === 's' || size === 'xs');
  const levels = $derived(small ? heatLevels(pairHours(heatmap.grid)) : heatmap.levels);
  const names = $derived(weekdayNames(i18n.locale || 'en', size === 's' ? 'narrow' : 'short'));
  const busiest = $derived(busiestCell(heatmap.grid));
  const axis = $derived(size === 's' ? [0, 12, 24] : [0, 6, 12, 18, 24]);
  const labelPx = $derived(size === 's' ? 16 : 36);
</script>

{#snippet grid(className: string, labels: boolean)}
  <div
    role="img"
    aria-label={t(messages.grid)}
    class={cn('grid min-h-0', className)}
    style="grid-template-columns: {labels ? `${labelPx}px ` : ''}repeat({levels[0].length}, minmax(0, 1fr)); grid-template-rows: repeat(7, minmax(0, 1fr))"
  >
    {#each levels as row, weekday (weekday)}
      {#if labels}
        <span class="flex items-center font-mono text-[11px] leading-none text-muted-foreground">{names[weekday]}</span>
      {/if}
      {#each row as level, hour (hour)}<ChartHeatCell {level} class="size-full rounded-[3px]" />{/each}
    {/each}
  </div>
{/snippet}

{#snippet hours()}
  <div class="flex justify-between font-mono text-[11px] text-muted-foreground tabular-nums" style="padding-left: {labelPx}px" aria-hidden="true">
    {#each axis as hour (hour)}<span>{t(messages.hour(hour))}</span>{/each}
  </div>
{/snippet}

{#snippet legend()}
  <span class="flex items-center gap-1.5">
    <span>{t(messages.less)}</span>
    {#each LEGEND as level (level)}<ChartHeatCell {level} />{/each}
    <span>{t(messages.more)}</span>
  </span>
{/snippet}

{#snippet aside()}
  {#if size === 's'}
    <span>{t(messages.daysShort(heatmap.days))}</span>
  {:else}
    {@render legend()}
  {/if}
{/snippet}

{#snippet side()}
  {@render grid('h-[34px] w-[64px] gap-px', false)}
{/snippet}

<Widget
  {size}
  {editing}
  title={t(messages.title)}
  icon={CalendarDaysIcon as LucideIcon}
  meta={size === 'm' || size === 'l' ? t(messages.lastDays(heatmap.days)) : undefined}
  aside={size === 'xs' ? undefined : aside}
  side={busiest ? side : undefined}
>
  <WidgetBody
    {size}
    locked={!widgets.canReadJobs}
    loading={heatmap.stats.isPending}
    error={heatmap.stats.isError}
    onRetry={() => void heatmap.stats.refetch()}
    empty={!busiest}
    emptyTitle={t(messages.empty)}
    emptyText={t(messages.emptyText)}
  >
    {#if size === 'xs'}
      {#if busiest}
        <p data-part="heatmap" class="flex h-7 min-w-0 items-baseline gap-1.5">
          <span class="font-display text-xl font-medium whitespace-nowrap">{names[busiest.weekday]} {t(messages.hour(busiest.hour))}</span>
          <span class="truncate text-xs text-muted-foreground">{t(messages.busiest)}</span>
        </p>
      {/if}
    {:else}
      <div data-part="heatmap" class="flex min-h-0 flex-1 flex-col gap-1.5">
        {@render grid(cn(size === 'l' ? 'h-[196px]' : 'flex-1', size === 's' ? 'gap-1' : 'gap-[3px]'), true)}
        {@render hours()}
        {#if size === 'l' && busiest}
          <p class="mt-auto flex items-center text-xs text-muted-foreground">
            <span>{t(messages.busiestAt(names[busiest.weekday], busiest.hour, busiest.count))}</span>
            <span class="ml-auto tabular-nums">{t(messages.runs(heatmap.total))}</span>
          </p>
        {/if}
      </div>
    {/if}
  </WidgetBody>
</Widget>
