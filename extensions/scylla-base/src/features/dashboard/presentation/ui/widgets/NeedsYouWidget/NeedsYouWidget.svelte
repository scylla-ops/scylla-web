<script lang="ts">
  import type { Snippet } from 'svelte';
  import InboxIcon from '@lucide/svelte/icons/inbox';
  import { ChartDot, Widget, type ChartTone, type LucideIcon, type WidgetSize } from '@scylla/ui';
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
  import WidgetBody from '../parts/WidgetBody.svelte';
  import AttentionActions from './AttentionActions.svelte';

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
  const ROWS: Readonly<Record<WidgetSize, number>> = { xs: 1, s: 1, m: 2, l: 4 };

  const maxRows = $derived(ROWS[size]);
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

  const sentence = (item: AttentionItem): string => {
    const when = getRelativeTime(item.at);
    if (item.kind === 'failed') return t(messages.failedSentence(item.pipelineName, when));
    if (item.kind === 'orphaned') return t(messages.orphanedSentence(item.pipelineName, when));
    return t(messages.approvalSentence(item.pipelineName));
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

{#snippet status(item: AttentionItem, split: boolean)}
  <p class="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
    <ChartDot tone={TONES[item.kind]} />
    <span class="truncate">{statusLine(item)}</span>
    {#if split}
      <span class="ml-auto shrink-0 pl-2">{item.projectName}</span>
    {:else}
      <span class="shrink-0">· {item.projectName}</span>
    {/if}
  </p>
{/snippet}

{#snippet more()}
  {#if items.length > shown.length}
    <p class="mt-auto pt-2 text-xs text-primary">{t(messages.moreItems(items.length - shown.length))}</p>
  {/if}
{/snippet}

<Widget
  {size}
  {editing}
  bare={size === 'xs'}
  title={t(widgetMessages.needsYou)}
  icon={InboxIcon as LucideIcon}
  meta={size === 'l' ? t(widgetMessages.openNow) : undefined}
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
    {#if size === 'xs'}
      <div data-part="needs-you" class="flex min-w-0 items-center gap-4">
        <p class="text-[40px] leading-none font-medium tracking-tight text-status-failed tabular-nums">
          {items.length}
        </p>
        <div class="min-w-0">
          <p class="text-sm font-medium">{t(widgetMessages.needsYou)}</p>
          <p class="truncate text-xs text-muted-foreground">{sentence(shown[0])}</p>
        </div>
      </div>
    {:else if size === 's'}
      <div data-part="needs-you" class="flex min-h-0 flex-1 flex-col gap-0.5">
        {@render status(shown[0], true)}
        <p class="truncate text-base font-medium">{shown[0].pipelineName}</p>
        <p class="truncate text-xs text-muted-foreground">{reason(shown[0])}</p>
        <AttentionActions item={shown[0]} class="mt-2" />
        {@render more()}
      </div>
    {:else if size === 'm'}
      <ul data-part="needs-you" class="grid grid-cols-2">
        {#each shown as item (item.jobId)}
          <li class="flex min-w-0 flex-col gap-0.5 border-l border-border px-5 first:border-l-0 first:pl-0 last:pr-0">
            {@render status(item, true)}
            <p class="truncate text-base font-medium">{item.pipelineName}</p>
            <p class="line-clamp-2 text-xs text-muted-foreground">{reason(item)}</p>
            <AttentionActions {item} class="mt-2" />
          </li>
        {/each}
      </ul>
    {:else}
      <ul data-part="needs-you" class="flex min-h-0 flex-col">
        {#each shown as item (item.jobId)}
          <li class="flex items-start gap-3 border-b border-border py-3 first:pt-0 last:border-0">
            <div class="flex min-w-0 flex-1 flex-col gap-0.5">
              {@render status(item, false)}
              <p class="truncate text-base font-medium">{item.pipelineName}</p>
              <p class="truncate text-xs text-muted-foreground">{reason(item)}</p>
            </div>
            <AttentionActions {item} class="mt-4" />
          </li>
        {/each}
      </ul>
      {@render more()}
    {/if}
  </WidgetBody>
</Widget>
