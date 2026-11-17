<script lang="ts">
  import type { Snippet } from 'svelte';
  import ActivityIcon from '@lucide/svelte/icons/activity';
  import { ChartDot, ChartSegment, Widget, type WidgetSize, type LucideIcon } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { widgetMessages as messages } from '@base/features/dashboard/presentation/messages/widgets.messages.ts';
  import { liveJobs } from '@base/features/dashboard/presentation/presenters/widget-rows.presenter.ts';
  import type { DashboardWidgets } from '../dashboard-widgets.state.svelte.ts';
  import { openJob } from '../widget-navigation.ts';
  import WidgetBody from '../parts/WidgetBody.svelte';

  interface Props {
    widgets: DashboardWidgets;
    now?: () => number;
    size?: WidgetSize;
    /** The controls of the edit mode, over the card. */
    editing?: Snippet;
  }

  let { widgets, now = Date.now, size = 'm', editing }: Props = $props();

  const maxRows = $derived(size === 'l' ? 8 : 3);

  const live = $derived(liveJobs(widgets.live.data ?? [], widgets.pipelines, now()));
</script>

{#snippet aside()}
  <span>{t(messages.live)}</span>
{/snippet}

<Widget {size} {editing} title={t(messages.rightNow)} icon={ActivityIcon as LucideIcon} {aside}>
  <WidgetBody
    {size}
    locked={!widgets.canReadJobs}
    loading={widgets.live.isPending}
    error={widgets.live.isError}
    onRetry={() => void widgets.live.refetch()}
    empty={live.running.length === 0 && live.waiting.length === 0}
    emptyTitle={t(messages.nothingRuns)}
    emptyText={t(messages.nothingRunsText)}
  >
    <div class="grid min-h-0 flex-1 grid-cols-1 gap-4 @3xl:grid-cols-2">
      <section class="flex min-w-0 flex-col gap-2">
        <header class="flex justify-between text-xs text-muted-foreground">
          <span>{t(messages.runningCount(live.running.length))}</span>
          <span>{t(messages.elapsedMedian)}</span>
        </header>
        {#each live.running.slice(0, maxRows) as row (row.jobId)}
          <button
            type="button"
            class="flex flex-col gap-1 text-left"
            onclick={() => openJob(row)}
          >
            <span class="flex min-w-0 items-center gap-2 text-sm">
              <ChartDot tone="running" />
              <span class="truncate font-medium">{row.pipelineName}</span>
              <span class="ml-auto shrink-0 text-xs text-muted-foreground tabular-nums">
                {row.elapsed}{#if row.overrun}&nbsp;· {row.overrun}{:else if row.expected}&nbsp;· ~{row.expected}{/if}
              </span>
            </span>
            {#if row.progress !== null}
              <span class="block h-1 w-full rounded-full bg-muted">
                <ChartSegment tone="running" class="h-1" style="width: {row.progress * 100}%" />
              </span>
            {/if}
          </button>
        {/each}
      </section>
      <section class="flex min-w-0 flex-col gap-2 @3xl:border-l @3xl:pl-4">
        <header class="flex justify-between text-xs text-muted-foreground">
          <span>{t(messages.waitingCount(live.waiting.length))}</span>
          <span>{t(messages.waits)}</span>
        </header>
        {#each live.waiting.slice(0, maxRows) as row (row.jobId)}
          <button
            type="button"
            class="flex min-w-0 items-center gap-2 text-left text-sm"
            onclick={() => openJob(row)}
          >
            <ChartDot tone="queued" />
            <span class="truncate font-medium">{row.pipelineName}</span>
            <span class="truncate text-xs text-muted-foreground">
              {t(row.reason === 'approval' ? messages.waitsForApproval : messages.waitsForAgent)}
            </span>
            <span class="ml-auto shrink-0 text-xs text-muted-foreground tabular-nums">{row.waited}</span>
          </button>
        {/each}
      </section>
    </div>
  </WidgetBody>
</Widget>
