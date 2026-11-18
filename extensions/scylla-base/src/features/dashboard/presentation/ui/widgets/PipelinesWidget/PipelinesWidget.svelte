<script lang="ts">
  import type { Snippet } from 'svelte';
  import HeartPulseIcon from '@lucide/svelte/icons/heart-pulse';
  import { ChartDot, Widget, type LucideIcon, type WidgetSize } from '@scylla/ui';
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

  const maxChips = $derived(size === 'l' ? 40 : size === 'm' ? 12 : 6);
  const rows = $derived(pipelineRows(widgets.pipelineItems, PIPELINE_RUNS, timeZone));
  const shown = $derived(rows.slice(0, maxChips));
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
  meta={t(messages.failingFirst)}
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
  </WidgetBody>
</Widget>
