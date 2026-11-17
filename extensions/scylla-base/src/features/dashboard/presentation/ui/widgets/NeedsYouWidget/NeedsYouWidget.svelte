<script lang="ts">
  import type { Snippet } from 'svelte';
  import InboxIcon from '@lucide/svelte/icons/inbox';
  import { ChartDot, ChartLegendItem, ChartSegment, Widget, type WidgetSize, type ChartTone, type LucideIcon } from '@scylla/ui';
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import type { MessageDescriptor } from '@lingui/core';
  import { widgetMessages as messages } from '@base/features/dashboard/presentation/messages/widgets.messages.ts';
  import {
    attentionCounts,
    attentionItems,
    whenText,
    type AttentionKind,
  } from '@base/features/dashboard/presentation/presenters/widget-rows.presenter.ts';
  import type { DashboardPeriodState } from '@base/features/dashboard/presentation/ui/dashboard-period.state.svelte.ts';
  import type { DashboardWidgets } from '../dashboard-widgets.state.svelte.ts';
  import { openJob } from '../widget-navigation.ts';
  import WidgetBody from '../parts/WidgetBody.svelte';

  interface Props {
    widgets: DashboardWidgets;
    period: DashboardPeriodState;
    size?: WidgetSize;
    /** The controls of the edit mode, over the card. */
    editing?: Snippet;
  }

  let { widgets, period, size = 'm', editing }: Props = $props();

  const maxRows = $derived(size === 'l' ? 8 : 3);

  const KINDS: Readonly<Record<AttentionKind, { tone: ChartTone; label: MessageDescriptor }>> = {
    failed: { tone: 'failed', label: messages.failedLower },
    orphaned: { tone: 'canceled', label: messages.orphanedLower },
    approval: { tone: 'queued', label: messages.approval },
  };

  const items = $derived(attentionItems(widgets.summaries.data?.items ?? [], widgets.live.data ?? []));
  const counts = $derived(attentionCounts(items));
</script>

{#snippet aside()}
  {#if items.length > 0}
    <span class="tabular-nums">{items.length} {t(messages.openNow)}</span>
  {/if}
{/snippet}

<Widget {size} {editing} title={t(messages.needsYou)} icon={InboxIcon as LucideIcon} {aside}>
  <WidgetBody
    {size}
    locked={!widgets.canReadPipelines || !widgets.canReadJobs}
    loading={widgets.summaries.isPending || widgets.live.isPending}
    error={widgets.summaries.isError || widgets.live.isError}
    onRetry={() => {
      void widgets.summaries.refetch();
      void widgets.live.refetch();
    }}
    empty={items.length === 0}
    emptyKind="all-clear"
    emptyTitle={t(messages.allClear)}
    emptyText={t(messages.allClearText)}
  >
    <div class="flex flex-col gap-1.5">
      <div class="flex h-1.5 gap-0.5">
        {#each counts as entry (entry.kind)}
          <ChartSegment tone={KINDS[entry.kind].tone} class="h-1.5" style="flex: {entry.count}" />
        {/each}
      </div>
      <div class="flex flex-wrap gap-x-3 gap-y-1">
        {#each counts as entry (entry.kind)}
          <ChartLegendItem tone={KINDS[entry.kind].tone} label={t(KINDS[entry.kind].label)} value={entry.count} />
        {/each}
      </div>
    </div>
    <ul class="mt-2 flex min-h-0 flex-col gap-1.5">
      {#each items.slice(0, maxRows) as item (item.jobId)}
        <li class="flex min-w-0 items-center gap-2 text-sm">
          <ChartDot tone={KINDS[item.kind].tone} />
          <span class="truncate font-medium">{item.pipelineName}</span>
          <span class="truncate text-xs text-muted-foreground">{item.projectName}</span>
          <span class="shrink-0 text-xs">{t(KINDS[item.kind].label)}</span>
          <span class="shrink-0 font-mono text-xs text-muted-foreground">{item.shortId}</span>
          <span class="ml-auto shrink-0 text-xs text-muted-foreground tabular-nums">
            {whenText(item.at, new Date(), period.timeZone ?? 'UTC')}
          </span>
          <Button variant="outline" size="xs" onclick={() => openJob(item)}>
            {t(item.kind === 'approval' ? messages.review : messages.logs)}
          </Button>
        </li>
      {/each}
    </ul>
  </WidgetBody>
</Widget>
