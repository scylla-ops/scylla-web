<script lang="ts">
  import type { Snippet } from 'svelte';
  import InboxIcon from '@lucide/svelte/icons/inbox';
  import { ChartDot, Widget, type ChartTone, type LucideIcon, type WidgetSize } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { getRelativeTime } from '@shared/utils/date-utils.ts';
  import { shortJobId } from '@base/features/dashboard/presentation/presenters/job-figures.presenter.ts';
  import type {
    AttentionItem,
    AttentionKind,
  } from '@base/features/dashboard/domain/structs/attention.struct.ts';
  import { widgetMessages } from '@base/features/dashboard/presentation/messages/widgets.messages.ts';
  import { viewMessages as messages } from '@base/features/dashboard/presentation/messages/widgets-view.messages.ts';
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
    'job-failed': 'failed',
    'job-orphaned': 'running',
    'fire-failed': 'failed',
    'fire-missed': 'warning',
    'agent-offline': 'muted',
    'approval-waiting': 'queued',
  };

  const ROWS: Readonly<Record<WidgetSize, number>> = { xs: 1, s: 1, m: 2, l: 4 };

  const list = $derived(widgets.attention.data);
  const items = $derived(list?.items ?? []);
  const shown = $derived(items.slice(0, ROWS[size]));
  const openCount = $derived(list?.openCount ?? 0);
  const more = $derived(Math.max(0, openCount - shown.length));

  const statusLine = (item: AttentionItem): string => {
    const when = getRelativeTime(item.at);
    switch (item.kind) {
      case 'job-failed':
        return t(messages.failedAt(when));
      case 'job-orphaned':
        return t(messages.orphanedAt(when));
      case 'approval-waiting':
        return t(messages.approvalSince(when));
      case 'fire-failed':
        return t(messages.fireFailedAt(when));
      case 'fire-missed':
        return t(messages.timeMissedAt(when));
      case 'agent-offline':
        return t(messages.agentOfflineAt(when));
    }
  };

  const title = (item: AttentionItem): string => item.agent?.name || item.pipelineName;

  const reason = (item: AttentionItem): string => {
    if (item.job) {
      const error = item.job.nodeError || item.job.error;
      if (item.kind === 'approval-waiting') return t(messages.approvalText);
      return error || t(messages.jobOf(shortJobId(item.job.id)));
    }
    if (item.fire) return item.fire.error || t(messages.fireOf(item.fire.triggerName));
    return t(messages.agentAway);
  };

  const key = (item: AttentionItem, index: number) =>
    `${item.kind}-${item.job?.id ?? item.fire?.id ?? item.agent?.id ?? index}`;
</script>

{#snippet aside()}
  {#if openCount > 0}
    <span class="font-medium text-foreground tabular-nums">
      {size === 's' ? openCount : t(messages.openAndNew(openCount, list?.newCount ?? 0))}
    </span>
  {/if}
{/snippet}

{#snippet status(item: AttentionItem, split: boolean)}
  <p class="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
    <ChartDot tone={TONES[item.kind]} />
    <span class="truncate">{statusLine(item)}</span>
    {#if item.count > 1}<span class="shrink-0">· {t(messages.times(item.count))}</span>{/if}
    {#if item.isNew}<span class="shrink-0 font-medium text-primary">{t(messages.newMark)}</span>{/if}
    {#if item.projectName}
      {#if split}
        <span class="ml-auto shrink-0 pl-2">{item.projectName}</span>
      {:else}
        <span class="shrink-0">· {item.projectName}</span>
      {/if}
    {/if}
  </p>
{/snippet}

{#snippet moreLine()}
  {#if more > 0}
    <p class="mt-auto pt-2 text-xs text-primary">{t(messages.moreItems(more))}</p>
  {/if}
{/snippet}

<Widget
  {size}
  {editing}
  bare={size === 'xs'}
  title={t(widgetMessages.needsYou)}
  icon={InboxIcon as LucideIcon}
  meta={size === 'l' ? t(messages.sinceLastVisit) : undefined}
  {aside}
>
  <WidgetBody
    {size}
    locked={widgets.attentionLocked}
    loading={widgets.attention.isPending && !widgets.attentionLocked}
    error={widgets.attention.isError && !widgets.attentionLocked}
    onRetry={() => void widgets.attention.refetch()}
    empty={items.length === 0}
    emptyKind="all-clear"
    emptyTitle={t(widgetMessages.allClear)}
    emptyText={t(messages.allClearText)}
  >
    {#if size === 'xs'}
      <div data-part="needs-you" class="flex min-w-0 items-center gap-4">
        <p class="text-[40px] leading-none font-medium tracking-tight text-status-failed tabular-nums">
          {openCount}
        </p>
        <div class="min-w-0">
          <p class="text-sm font-medium">{t(widgetMessages.needsYou)}</p>
          <p class="truncate text-xs text-muted-foreground">{title(shown[0])} · {statusLine(shown[0])}</p>
        </div>
      </div>
    {:else if size === 's'}
      <div data-part="needs-you" class="flex min-h-0 flex-1 flex-col gap-0.5">
        {@render status(shown[0], true)}
        <p class="truncate text-base font-medium">{title(shown[0])}</p>
        <p class="truncate text-xs text-muted-foreground">{reason(shown[0])}</p>
        <AttentionActions item={shown[0]} class="mt-2" />
        {@render moreLine()}
      </div>
    {:else if size === 'm'}
      <ul data-part="needs-you" class="grid grid-cols-2">
        {#each shown as item, index (key(item, index))}
          <li class="flex min-w-0 flex-col gap-0.5 border-l border-border px-5 first:border-l-0 first:pl-0 last:pr-0">
            {@render status(item, true)}
            <p class="truncate text-base font-medium">{title(item)}</p>
            <p class="line-clamp-2 text-xs text-muted-foreground">{reason(item)}</p>
            <AttentionActions {item} class="mt-2" />
          </li>
        {/each}
      </ul>
    {:else}
      <ul data-part="needs-you" class="flex min-h-0 flex-col">
        {#each shown as item, index (key(item, index))}
          <li class="flex items-start gap-3 border-b border-border py-3 first:pt-0 last:border-0">
            <div class="flex min-w-0 flex-1 flex-col gap-0.5">
              {@render status(item, false)}
              <p class="truncate text-base font-medium">{title(item)}</p>
              <p class="truncate text-xs text-muted-foreground">{reason(item)}</p>
            </div>
            <AttentionActions {item} class="mt-4" />
          </li>
        {/each}
      </ul>
      {@render moreLine()}
    {/if}
  </WidgetBody>
</Widget>
