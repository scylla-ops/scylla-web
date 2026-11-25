<script lang="ts">
  import type { Snippet } from 'svelte';
  import ListOrderedIcon from '@lucide/svelte/icons/list-ordered';
  import { ChartSegment, Widget, type ChartTone, type LucideIcon, type WidgetSize } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import { rankingMessages as messages } from '@base/features/dashboard/presentation/messages/ranking.messages.ts';
  import { periodMeta } from '@base/features/dashboard/presentation/presenters/job-figures.presenter.ts';
  import type { RankingMetric, RankingRow } from '@base/features/dashboard/presentation/presenters/ranking.presenter.ts';
  import type { DashboardPeriodState } from '@base/features/dashboard/presentation/ui/dashboard-period.state.svelte.ts';
  import type { DashboardWidgets } from '../dashboard-widgets.state.svelte.ts';
  import { linkMessages } from '@base/features/dashboard/presentation/messages/links.messages.ts';
  import { pipelineJobsLink } from '../widget-navigation.ts';
  import WidgetBody from '../parts/WidgetBody.svelte';
  import WidgetLink from '../parts/WidgetLink.svelte';
  import { createRanking } from './ranking.state.svelte.ts';

  interface Props {
    widgets: DashboardWidgets;
    period: DashboardPeriodState;
    metric: RankingMetric;
    size?: WidgetSize;
    editing?: Snippet;
  }

  let { widgets, period, metric, size = 'm', editing }: Props = $props();

  const ROWS: Readonly<Record<WidgetSize, number>> = { xs: 1, s: 4, m: 5, l: 10 };
  const CHANGE_TONES = { good: 'text-status-passed', bad: 'text-status-failed', neutral: 'text-muted-foreground' };

  const ranking = createRanking(() => widgets, () => metric);
  const shown = $derived(ranking.rows.slice(0, ROWS[size]));
  const tone = $derived<ChartTone>(metric === 'slowest' ? 'passed' : 'failed');
  const unit = $derived(metric === 'slowest' ? t(messages.p50) : t(messages.failed));
  const meta = $derived(
    metric === 'slowest' ? t(messages.p50Of(periodMeta(period.period))) : t(messages.failedOf(periodMeta(period.period))),
  );
</script>

{#snippet bar(row: RankingRow, className: string)}
  <span class={cn('flex h-1.5 overflow-hidden rounded-full bg-muted', className)} aria-hidden="true">
    <ChartSegment {tone} class="h-full rounded-full" style="width: {Math.max(2, row.bar)}%" />
  </span>
{/snippet}

{#snippet name(row: RankingRow, className: string)}
  <WidgetLink link={pipelineJobsLink(widgets.pipelines.get(row.id))} title={t(linkMessages.openJobs)} class={cn('min-w-0 truncate text-sm font-medium', className)}>
    {row.name}
  </WidgetLink>
{/snippet}

{#snippet aside()}
  {#if size === 's'}
    <span>{unit}</span>
  {:else if ranking.rows.length > 0}
    <span>{t(messages.pipelines(ranking.rows.length))}</span>
  {/if}
{/snippet}

<Widget
  {size}
  {editing}
  title={metric === 'slowest' ? t(messages.slowest) : t(messages.failing)}
  icon={ListOrderedIcon as LucideIcon}
  meta={size === 'm' || size === 'l' ? meta : undefined}
  aside={size === 'xs' ? undefined : aside}
>
  <WidgetBody
    {size}
    locked={!widgets.canReadJobs}
    loading={ranking.stats.isPending}
    error={ranking.stats.isError}
    onRetry={() => void ranking.stats.refetch()}
    empty={ranking.rows.length === 0}
    emptyKind={metric === 'failing' ? 'all-clear' : 'empty'}
    emptyTitle={metric === 'slowest' ? t(messages.empty) : t(messages.noFailure)}
    emptyText={metric === 'slowest' ? t(messages.emptyText) : t(messages.noFailureText)}
  >
    {#if size === 'xs'}
      {@const row = shown[0]}
      <div data-part="ranking" class="flex h-7 min-w-0 items-center gap-2">
        {@render name(row, 'flex-1 text-base')}
        <span class="shrink-0 font-mono text-sm tabular-nums">{row.value}</span>
      </div>
    {:else if size === 's'}
      <ol data-part="ranking" class="flex min-h-0 flex-col gap-2.5">
        {#each shown as row (row.id)}
          <li class="flex flex-col gap-1">
            <span class="flex min-w-0 items-baseline gap-2">
              {@render name(row, 'flex-1')}
              <span class="shrink-0 font-mono text-[13px] tabular-nums">{row.value}</span>
            </span>
            {@render bar(row, 'w-full')}
          </li>
        {/each}
      </ol>
    {:else}
      <ol data-part="ranking" class="flex min-h-0 flex-col gap-1">
        {#each shown as row (row.id)}
          <li class="flex h-7 min-w-0 items-center gap-3">
            <span class="w-4 shrink-0 text-xs text-muted-foreground tabular-nums">{row.rank}</span>
            {@render name(row, 'w-[30%] shrink-0')}
            {@render bar(row, 'min-w-8 flex-1')}
            <span class="w-16 shrink-0 text-right font-mono text-[13px] tabular-nums">{row.value}</span>
            <span class={cn('w-16 shrink-0 text-right text-xs tabular-nums', row.change && CHANGE_TONES[row.change.tone])}>
              {row.change?.label ?? ''}
            </span>
          </li>
        {/each}
      </ol>
    {/if}
  </WidgetBody>
</Widget>
