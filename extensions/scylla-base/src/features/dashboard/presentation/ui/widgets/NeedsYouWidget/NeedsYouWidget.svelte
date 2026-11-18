<script lang="ts">
  import type { Snippet } from 'svelte';
  import InboxIcon from '@lucide/svelte/icons/inbox';
  import { ChartDot, Widget, type ChartTone, type LucideIcon, type WidgetSize } from '@scylla/ui';
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { getRelativeTime } from '@shared/utils/date-utils.ts';
  import { widgetMessages } from '@base/features/dashboard/presentation/messages/widgets.messages.ts';
  import { viewMessages as messages } from '@base/features/dashboard/presentation/messages/widgets-view.messages.ts';
  import {
    attentionItems,
    type AttentionItem,
    type AttentionKind,
  } from '@base/features/dashboard/presentation/presenters/widget-rows.presenter.ts';
  import type { DashboardWidgets } from '../dashboard-widgets.state.svelte.ts';
  import { openJob } from '../widget-navigation.ts';
  import WidgetBody from '../parts/WidgetBody.svelte';

  interface Props {
    widgets: DashboardWidgets;
    size?: WidgetSize;
    /** The controls of the edit mode, over the card. */
    editing?: Snippet;
  }

  let { widgets, size = 'l', editing }: Props = $props();

  const TONES: Readonly<Record<AttentionKind, ChartTone>> = {
    failed: 'failed',
    orphaned: 'running',
    approval: 'queued',
  };

  const items = $derived(attentionItems(widgets.pipelineItems, widgets.liveJobs));
  const maxRows = $derived(size === 'l' ? 4 : size === 'm' ? 1 : 2);
  const shown = $derived(items.slice(0, maxRows));
  const errors = $derived(
    new Map([...widgets.endedJobs, ...widgets.liveJobs].map(job => [job.id, job.error])),
  );

  const statusLine = (item: AttentionItem): string => {
    const when = getRelativeTime(item.at);
    if (item.kind === 'failed') return t(messages.failedAt(when));
    if (item.kind === 'orphaned') return t(messages.orphanedAt(when));
    return t(messages.approvalSince(when));
  };

  const reason = (item: AttentionItem): string =>
    item.kind === 'approval'
      ? t(messages.approvalText)
      : errors.get(item.jobId) || t(messages.jobOf(item.shortId));
</script>

{#snippet aside()}
  {#if items.length > 0}
    <span class="font-medium text-foreground tabular-nums">{items.length}</span>
  {/if}
{/snippet}

<Widget
  {size}
  {editing}
  title={t(widgetMessages.needsYou)}
  icon={InboxIcon as LucideIcon}
  meta={t(widgetMessages.openNow)}
  {aside}
>
  <WidgetBody
    {size}
    locked={!widgets.canReadPipelines || !widgets.canReadJobs}
    loading={widgets.summaries.isPending || widgets.live.isPending}
    error={widgets.summaries.isError || widgets.live.isError}
    onRetry={() => void widgets.summaries.refetch()}
    empty={items.length === 0}
    emptyKind="all-clear"
    emptyTitle={t(widgetMessages.allClear)}
    emptyText={t(widgetMessages.allClearText)}
  >
    <ul class="flex min-h-0 flex-col">
      {#each shown as item (item.jobId)}
        <li class="flex items-start gap-3 border-b border-border py-3 first:pt-0 last:border-0">
          <div class="flex min-w-0 flex-1 flex-col gap-0.5">
            <p class="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
              <ChartDot tone={TONES[item.kind]} />
              <span class="truncate">{statusLine(item)}</span>
              <span class="shrink-0">· {item.projectName}</span>
            </p>
            <p class="truncate text-base font-medium">{item.pipelineName}</p>
            <p class="truncate text-xs text-muted-foreground">{reason(item)}</p>
          </div>
          <Button variant="outline" size="xs" class="mt-4" onclick={() => openJob(item)}>
            {t(item.kind === 'approval' ? widgetMessages.review : widgetMessages.logs)}
          </Button>
        </li>
      {/each}
    </ul>
    {#if items.length > shown.length}
      <p class="mt-auto text-xs text-muted-foreground">
        {t(messages.moreItems(items.length - shown.length))}
      </p>
    {/if}
  </WidgetBody>
</Widget>
