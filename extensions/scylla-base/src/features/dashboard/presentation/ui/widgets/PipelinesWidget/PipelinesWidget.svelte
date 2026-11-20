<script lang="ts">
  import type { Snippet } from 'svelte';
  import HeartPulseIcon from '@lucide/svelte/icons/heart-pulse';
  import { ChartDot, ChartSegment, Widget, type LucideIcon, type WidgetSize } from '@scylla/ui';
  import { cn } from '@scylla/ui/utils';
  import { t } from '@scylla/ui/i18n';
  import { widgetMessages as messages } from '@base/features/dashboard/presentation/messages/widgets.messages.ts';
  import { viewMessages } from '@base/features/dashboard/presentation/messages/widgets-view.messages.ts';
  import { pipelineRows } from '@base/features/dashboard/presentation/presenters/widget-rows.presenter.ts';
  import { PIPELINE_RUNS, type DashboardWidgets } from '../dashboard-widgets.state.svelte.ts';
  import { openPipelineJobs } from '../widget-navigation.ts';
  import WidgetBody from '../parts/WidgetBody.svelte';

  interface Props {
    widgets: DashboardWidgets;
    timeZone?: string;
    size?: WidgetSize;
    /** The controls of the edit mode, over the card. */
    editing?: Snippet;
  }

  let { widgets, timeZone = 'UTC', size = 'm', editing }: Props = $props();

  const TABLE_ROWS = 6;
  const LOW_RATE = 75;

  const maxChips = $derived(size === 'm' ? 12 : 6);
  const rows = $derived(pipelineRows(widgets.pipelineItems, PIPELINE_RUNS, timeZone));
  const shown = $derived(rows.slice(0, size === 'l' ? TABLE_ROWS : maxChips));
  const padded = (strip: readonly string[]) => Array.from({ length: PIPELINE_RUNS - strip.length }, () => null);
  const lowRate = (rate: string) => Number.parseInt(rate, 10) < LOW_RATE;
  const green = $derived(widgets.pipelineItems.filter(item => item.health === 'green').length);
</script>

{#snippet aside()}
  {#if rows.length > 0}
    <span>{t(viewMessages.pipelinesGreen(green, rows.length))}</span>
  {/if}
{/snippet}

<Widget
  {size}
  {editing}
  title={t(messages.pipelines)}
  icon={HeartPulseIcon as LucideIcon}
  meta={size === 'l' ? `${t(viewMessages.lastRuns(PIPELINE_RUNS))} · ${t(messages.failingFirst)}` : t(messages.failingFirst)}
  {aside}
>
  <WidgetBody
    {size}
    locked={!widgets.canReadPipelines}
    loading={widgets.summaries.isPending}
    error={widgets.summaries.isError}
    onRetry={() => void widgets.summaries.refetch()}
    empty={rows.length === 0}
    emptyTitle={t(messages.noPipelinesYet)}
    emptyText={t(messages.noPipelinesYetText)}
  >
    {#if size === 'l'}
      <table data-part="health-table" class="w-full table-fixed text-left">
        <thead>
          <tr class="text-xs text-muted-foreground">
            <th class="pb-3 font-normal">{t(viewMessages.pipelineColumn)}</th>
            <th class="w-[188px] pb-3 text-right font-normal">{t(viewMessages.lastRuns(PIPELINE_RUNS))}</th>
            <th class="w-16 pb-3 text-right font-normal">{t(viewMessages.successColumn)}</th>
            <th class="w-16 pb-3 text-right font-normal">{t(viewMessages.medianColumn)}</th>
          </tr>
        </thead>
        <tbody>
          {#each shown as row (row.id)}
            <tr class="hover:bg-accent/50">
              <td class="py-2 pr-3">
                <button type="button" class="block w-full min-w-0 text-left" onclick={() => openPipelineJobs(row)}>
                  <span class="block truncate text-sm font-medium">{row.name}</span>
                  <span class="block truncate text-xs text-muted-foreground">{row.projectName} · {row.trigger}</span>
                </button>
              </td>
              <td class="py-2">
                <div class="flex h-[18px] justify-end gap-0.5" role="img" aria-label={t(viewMessages.lastRuns(PIPELINE_RUNS))}>
                  {#each padded(row.strip) as _, index (index)}
                    <span class="w-[7px] rounded-[2px] bg-muted"></span>
                  {/each}
                  {#each row.strip as tone, index (index)}
                    <ChartSegment {tone} class="w-[7px] rounded-[2px]" />
                  {/each}
                </div>
              </td>
              <td class={cn('py-2 text-right text-sm font-medium tabular-nums', lowRate(row.rate) && 'text-status-failed')}>
                {row.rate}
              </td>
              <td class="py-2 text-right font-mono text-sm whitespace-nowrap text-muted-foreground">{row.median}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {:else}
      <ul class="flex flex-wrap content-start gap-2 pt-2">
        {#each shown as row (row.id)}
          <li>
            <button
              type="button"
              class="inline-flex h-7 max-w-48 items-center gap-1.5 rounded-full border border-border px-2.5 text-xs transition-colors hover:bg-accent"
              onclick={() => openPipelineJobs(row)}
            >
              <ChartDot tone={row.tone === 'running' ? 'warning' : row.tone} class="size-1.5" />
              <span class="truncate">{row.name}</span>
            </button>
          </li>
        {/each}
      </ul>
      {#if rows.length > shown.length}
        <p class="mt-auto text-xs text-muted-foreground">
          {t(viewMessages.moreItems(rows.length - shown.length))}
        </p>
      {/if}
    {/if}
  </WidgetBody>
</Widget>
