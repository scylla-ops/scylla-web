<script lang="ts">
  import GitBranchIcon from '@lucide/svelte/icons/git-branch';
  import { ChartDot, ChartLegendItem, ChartSegment, Widget, type LucideIcon } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { widgetMessages as messages } from '@base/features/dashboard/presentation/messages/widgets.messages.ts';
  import { pipelineRows } from '@base/features/dashboard/presentation/presenters/widget-rows.presenter.ts';
  import { PIPELINE_RUNS, type DashboardWidgets } from '../dashboard-widgets.state.svelte.ts';
  import { openPipelineJobs } from '../widget-navigation.ts';
  import WidgetBody from '../parts/WidgetBody.svelte';

  interface Props {
    widgets: DashboardWidgets;
  }

  let { widgets }: Props = $props();

  const MAX_ROWS = 10;

  const list = $derived(widgets.summaries.data);
  const rows = $derived(pipelineRows(list?.items.slice(0, MAX_ROWS) ?? [], PIPELINE_RUNS));
</script>

{#snippet aside()}
  {#if list && list.total > 0}
    <span class="tabular-nums">{t(messages.greenOfTotal(list.green, list.total))}</span>
  {/if}
{/snippet}

<Widget
  size="l"
  title={t(messages.pipelines)}
  icon={GitBranchIcon as LucideIcon}
  meta={t(messages.failingFirst)}
  {aside}
>
  <WidgetBody
    size="l"
    locked={!widgets.canReadPipelines}
    loading={widgets.summaries.isPending}
    error={widgets.summaries.isError}
    onRetry={() => void widgets.summaries.refetch()}
    empty={!list || list.total === 0}
    emptyTitle={t(messages.noPipelinesYet)}
    emptyText={t(messages.noPipelinesYetText)}
  >
    <table class="w-full table-fixed text-xs">
      <thead class="text-muted-foreground">
        <tr class="h-6">
          <th class="text-left font-normal">{t(messages.pipelineColumn)}</th>
          <th class="hidden w-36 text-left font-normal @3xl:table-cell">
            {t(messages.lastRuns(PIPELINE_RUNS))}
          </th>
          <th class="w-14 text-right font-normal">{t(messages.successColumn)}</th>
          <th class="w-16 text-right font-normal">{t(messages.medianColumn)}</th>
        </tr>
      </thead>
      <tbody>
        {#each rows as row (row.id)}
          <tr
            class="h-7 cursor-pointer hover:bg-muted/50"
            onclick={() => openPipelineJobs(row)}
          >
            <td class="truncate">
              <span class="inline-flex min-w-0 items-center gap-2">
                <ChartDot tone={row.tone} />
                <span class="truncate text-sm font-medium">{row.name}</span>
                <span class="truncate text-muted-foreground">{row.projectName} · {row.trigger}</span>
              </span>
            </td>
            <td class="hidden @3xl:table-cell">
              <span class="flex h-3.5 items-stretch gap-px">
                {#each row.strip as tone, index (index)}
                  <ChartSegment {tone} class="w-1.5" />
                {/each}
              </span>
            </td>
            <td class="text-right tabular-nums">{row.rate}</td>
            <td class="text-right text-muted-foreground tabular-nums">{row.median}</td>
          </tr>
        {/each}
      </tbody>
    </table>
    <div class="mt-auto flex items-center gap-3 pt-2">
      <ChartLegendItem tone="passed" label={t(messages.green)} />
      <ChartLegendItem tone="failed" label={t(messages.red)} />
      <ChartLegendItem tone="running" label={t(messages.runningNow)} />
    </div>
  </WidgetBody>
</Widget>
