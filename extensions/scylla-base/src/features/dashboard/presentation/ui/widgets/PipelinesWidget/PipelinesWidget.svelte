<script lang="ts">
  import type { Snippet } from 'svelte';
  import GitBranchIcon from '@lucide/svelte/icons/git-branch';
  import { ChartDot, ChartLegendItem, ChartSegment, Widget, type LucideIcon, type WidgetSize } from '@scylla/ui';
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { JobRunMark } from '@shared/presentation/ui';
  import { widgetMessages } from '@base/features/dashboard/presentation/messages/widgets.messages.ts';
  import { pipelinesMessages as messages } from '@base/features/dashboard/presentation/messages/pipelines.messages.ts';
  import { pipelineRows, type PipelineRow } from '@base/features/dashboard/presentation/presenters/widget-rows.presenter.ts';
  import { PIPELINE_RUNS, type DashboardWidgets } from '../dashboard-widgets.state.svelte.ts';
  import { openJob, openPipelineJobs } from ../widget-navigation.ts;
  import { viewPermissionName } from @base/features/dashboard/presentation/presenters/permission-name.presenter.ts;
  import WidgetBody from '../parts/WidgetBody.svelte';
  import PipelineTable from './PipelineTable.svelte';
  import PipelinesSheet from './PipelinesSheet.svelte';

  interface Props {
    widgets: DashboardWidgets;
    timeZone?: string;
    size?: WidgetSize;
    /** The controls of the edit mode, over the card. */
    editing?: Snippet;
  }

  let { widgets, timeZone = 'UTC', size = 'm', editing }: Props = $props();

  const ROWS: Readonly<Record<WidgetSize, number>> = { xs: 0, s: 3, m: 5, l: 10 };
  const DOTS = 12;
  const SMALL_RUNS = 10;

  const rows = $derived(pipelineRows(widgets.pipelineItems, PIPELINE_RUNS, timeZone));
  const green = $derived(widgets.pipelineItems.filter(item => item.health === 'green').length);
  const failing = $derived(rows.filter(row => row.tone === 'failed').slice(0, ROWS.s));
  const shown = $derived(rows.slice(0, ROWS[size]));

  let sheetOpen = $state(false);

  const dotTone = (row: PipelineRow) => (row.tone === 'running' ? 'warning' : row.tone);
</script>

{#snippet aside()}
  {#if rows.length > 0}<span>{t(messages.greenOf(green, rows.length))}</span>{/if}
{/snippet}

<Widget
  {size}
  {editing}
  title={t(widgetMessages.pipelines)}
  icon={GitBranchIcon as LucideIcon}
  meta={size === 'xs' ? undefined : t(messages.failingFirst)}
  aside={size === 'm' || size === 'l' ? aside : undefined}
>
  <WidgetBody
    {size}
    retrySeconds={30}
    permission={viewPermissionName('pipelines')}
    locked={!widgets.canReadPipelines}
    loading={widgets.summaries.isPending}
    error={widgets.summaries.isError}
    onRetry={() => void widgets.summaries.refetch()}
    empty={rows.length === 0}
    emptyTitle={t(widgetMessages.noPipelinesYet)}
    emptyText={t(widgetMessages.noPipelinesYetText)}
  >
    {#if size === 'xs'}
      <div data-part="pipelines" class="flex h-7 min-w-0 items-center gap-1.5">
        <span class="font-display text-xl font-medium tabular-nums">{green}/{rows.length}</span>
        <span class="text-xs text-muted-foreground">{t(messages.green)}</span>
        <span class="ml-auto flex shrink-0 items-center gap-1" aria-hidden="true">
          {#each rows.slice(0, DOTS) as row (row.id)}<ChartDot tone={dotTone(row)} />{/each}
        </span>
      </div>
    {:else if size === 's'}
      <div data-part="pipelines" class="flex min-h-0 flex-col gap-2">
        <p class="flex items-baseline gap-1.5">
          <span class="font-display text-[34px] leading-10 font-medium tabular-nums">{green}</span>
          <span class="text-[15px] text-muted-foreground">{t(messages.ofGreen(rows.length))}</span>
        </p>
        <ul class="flex flex-col gap-1.5">
          {#each failing as row (row.id)}
            <li class="flex h-5 min-w-0 items-center gap-2">
              <ChartDot tone={dotTone(row)} />
              <button type="button" class="min-w-0 flex-1 truncate text-left text-sm font-medium hover:underline" onclick={() => openPipelineJobs(row)}>
                {row.name}
              </button>
              <span class="flex h-3 shrink-0 gap-0.5" role="group" aria-label={t(messages.lastRuns(SMALL_RUNS))}>
                {#each row.runs.slice(-SMALL_RUNS) as mark (mark.jobId)}
                  <JobRunMark run={mark.run} duration={mark.seconds} class="h-full w-[5px] rounded-[1px]" onSelect={() => openJob(mark)}>
                    <ChartSegment tone={mark.tone} class="size-full rounded-[1px]" />
                  </JobRunMark>
                {/each}
              </span>
              <span class="w-10 shrink-0 text-right text-xs font-medium tabular-nums">{row.rate}</span>
            </li>
          {:else}
            <li class="text-xs text-muted-foreground">{t(messages.allGreen)}</li>
          {/each}
        </ul>
      </div>
    {:else}
      <div data-part="pipelines" class="flex min-h-0 flex-1 flex-col">
        <PipelineTable rows={shown} />
        {#if size === 'l'}
          <div class="mt-auto flex items-center gap-3 pt-2">
            <ChartLegendItem tone="passed" label={t(messages.green)} />
            <ChartLegendItem tone="failed" label={t(messages.red)} />
            <ChartLegendItem tone="warning" label={t(messages.runningNow)} />
            {#if rows.length > shown.length}
              <Button variant="ghost" size="xs" class="ml-auto text-primary" onclick={() => (sheetOpen = true)}>
                {t(messages.seeAll(rows.length))}
              </Button>
            {/if}
          </div>
        {/if}
      </div>
    {/if}
  </WidgetBody>
</Widget>

<PipelinesSheet open={sheetOpen} {rows} {green} onClose={() => (sheetOpen = false)} />
