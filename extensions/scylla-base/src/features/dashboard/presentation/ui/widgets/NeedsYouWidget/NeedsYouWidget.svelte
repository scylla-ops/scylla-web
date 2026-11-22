<script lang="ts">
  import type { Snippet } from 'svelte';
  import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
  import InboxIcon from '@lucide/svelte/icons/inbox';
  import { ChartDot, ChartLegendItem, ChartSegment, Widget, type LucideIcon, type WidgetSize } from '@scylla/ui';
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import type { AttentionItem } from '@base/features/dashboard/domain/structs/attention.struct.ts';
  import { attentionMessages as messages } from '@base/features/dashboard/presentation/messages/attention.messages.ts';
  import { widgetMessages } from '@base/features/dashboard/presentation/messages/widgets.messages.ts';
  import {
    ATTENTION_TONES,
    attentionCounts,
    attentionLabel,
    attentionTitle,
    attentionWhen,
  } from '@base/features/dashboard/presentation/presenters/attention.presenter.ts';
  import { clockIn } from '@base/features/dashboard/presentation/presenters/zoned-day.presenter.ts';
  import type { DashboardWidgets } from '../dashboard-widgets.state.svelte.ts';
  import { viewPermissionName } from '@base/features/dashboard/presentation/presenters/permission-name.presenter.ts';
  import WidgetBody from '../parts/WidgetBody.svelte';
  import AttentionRow from './AttentionRow.svelte';
  import NeedsYouSheet from './NeedsYouSheet.svelte';

  interface Props {
    widgets: DashboardWidgets;
    size?: WidgetSize;
    timeZone?: string;
    /** The controls of the edit mode, over the card. */
    editing?: Snippet;
  }

  let { widgets, size = 'l', timeZone = 'UTC', editing }: Props = $props();

  const ROWS: Readonly<Record<WidgetSize, number>> = { xs: 0, s: 4, m: 3, l: 5 };
  const DOTS = 8;

  const list = $derived(widgets.attention.data);
  const items = $derived(list?.items ?? []);
  const openCount = $derived(list?.openCount ?? items.length);
  const newCount = $derived(list?.newCount ?? 0);
  const counts = $derived(attentionCounts(list?.counts ?? []));
  const shown = $derived(items.slice(0, ROWS[size]));
  const more = $derived(Math.max(0, openCount - shown.length));
  const clear = $derived(!!list && items.length === 0);
  const since = $derived(widgets.since ? clockIn(new Date(widgets.since), timeZone) : null);

  let sheetOpen = $state(false);

  const key = (item: AttentionItem, index: number) =>
    `${item.kind}-${item.job?.id ?? item.fire?.id ?? item.agent?.id ?? index}`;
</script>

{#snippet aside()}
  {#if newCount > 0}
    <span class="font-medium text-primary tabular-nums">{t(messages.newCount(newCount))}</span>
  {/if}
{/snippet}

{#snippet footer()}
  {#if more > 0 || items.length > shown.length}
    <div class="mt-auto flex items-center gap-2 pt-2">
      {#if more > 0}<span class="text-xs text-muted-foreground">{t(messages.more(more))}</span>{/if}
      <Button variant="ghost" size="xs" class="ml-auto text-primary" onclick={() => (sheetOpen = true)}>
        {size === 'l' ? t(messages.seeAllCount(openCount)) : t(messages.seeAll)}
      </Button>
    </div>
  {/if}
{/snippet}

<Widget
  {size}
  {editing}
  title={t(widgetMessages.needsYou)}
  icon={InboxIcon as LucideIcon}
  meta={size === 'xs' ? undefined : t(clear ? messages.nothingOpen : messages.openNow)}
  {aside}
>
  <WidgetBody
    {size}
    retrySeconds={30}
    permission={viewPermissionName('jobs')}
    locked={widgets.attentionLocked}
    loading={widgets.attention.isPending && !widgets.attentionLocked}
    error={widgets.attention.isError && !widgets.attentionLocked}
    onRetry={() => void widgets.attention.refetch()}
  >
    {#if clear}
      {#if size === 'xs'}
        <p data-part="needs-you" class="flex items-center gap-2 font-display text-xl leading-7 font-medium">
          <CircleCheckIcon aria-hidden="true" class="size-4 text-primary" />
          {t(messages.allClear)}
        </p>
      {:else}
        <div data-part="needs-you" class="m-auto flex max-w-[400px] flex-col items-center gap-2 text-center">
          <span class="flex size-9 items-center justify-center rounded-full bg-muted">
            <CircleCheckIcon aria-hidden="true" class="size-[18px] text-primary" />
          </span>
          <p class="font-display text-[15px] font-medium">{t(messages.allClear)}</p>
          {#if size !== 's'}
            <p class="text-xs leading-4 text-muted-foreground">{t(messages.allClearText)}</p>
          {/if}
        </div>
      {/if}
    {:else if size === 'xs'}
      <div data-part="needs-you" class="flex h-7 min-w-0 items-center gap-1.5">
        <span class="font-display text-xl font-medium tabular-nums">{openCount}</span>
        <span class="text-[15px]">{t(messages.open)}</span>
        <span class="ml-auto flex shrink-0 items-center gap-1" aria-hidden="true">
          {#each items.slice(0, DOTS) as item, index (key(item, index))}
            <ChartDot tone={ATTENTION_TONES[item.kind]} />
          {/each}
        </span>
      </div>
    {:else if size === 's'}
      <ul data-part="needs-you" class="flex min-w-0 flex-col gap-2">
        {#each shown as item, index (key(item, index))}
          <li class="flex h-5 min-w-0 items-center gap-2">
            <ChartDot tone={ATTENTION_TONES[item.kind]} />
            <span class="truncate text-sm font-medium">{attentionTitle(item)}</span>
            <span class="ml-auto flex shrink-0 items-center gap-2 text-xs">
              {#if item.isNew}<span class="font-medium text-primary">{t(messages.newMark)}</span>{/if}
              <span class="text-muted-foreground tabular-nums">{attentionWhen(item, timeZone, true)}</span>
            </span>
          </li>
        {/each}
      </ul>
      {@render footer()}
    {:else if size === 'm'}
      <div data-part="needs-you" class="flex min-h-0 flex-1 items-center gap-5">
        <div class="flex w-[95px] shrink-0 flex-col gap-1">
          <p class="flex items-baseline gap-1.5">
            <span class="font-display text-[34px] leading-10 font-medium tabular-nums">{openCount}</span>
            <span class="text-[15px]">{t(messages.open)}</span>
          </p>
          <div class="flex flex-col gap-0.5">
            {#each counts as count (count.kind)}
              <ChartLegendItem tone={ATTENTION_TONES[count.kind]} label={attentionLabel(count.kind)} value={count.open} />
            {/each}
          </div>
        </div>
        <span class="w-px self-stretch bg-border" aria-hidden="true"></span>
        <ul class="flex min-w-0 flex-1 flex-col gap-2">
          {#each shown as item, index (key(item, index))}
            <AttentionRow {item} {timeZone} />
          {/each}
        </ul>
      </div>
    {:else}
      <div data-part="needs-you" class="flex min-h-0 flex-1 flex-col">
        <div class="flex items-center gap-2.5">
          <span class="font-display text-[34px] leading-10 font-medium tabular-nums">{openCount}</span>
          <div class="flex min-w-0 flex-col">
            <span class="text-[15px] leading-5">{t(messages.openNow)}</span>
            {#if newCount > 0}
              <span class="truncate text-xs text-muted-foreground">
                {since ? t(messages.newSince(newCount, since)) : t(messages.newSinceFirst(newCount))}
              </span>
            {/if}
          </div>
        </div>
        <div class="mt-3 flex h-1.5 w-full gap-0.5" aria-hidden="true">
          {#each counts as count (count.kind)}
            <ChartSegment tone={ATTENTION_TONES[count.kind]} class="h-full rounded-full" style="flex: {count.open} 1 0" />
          {/each}
        </div>
        <div class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
          {#each counts as count (count.kind)}
            <ChartLegendItem tone={ATTENTION_TONES[count.kind]} label={attentionLabel(count.kind)} value={count.open} />
          {/each}
        </div>
        <ul class="mt-3 flex min-w-0 flex-col gap-2.5">
          {#each shown as item, index (key(item, index))}
            <AttentionRow {item} {timeZone} actions />
          {/each}
        </ul>
        {@render footer()}
      </div>
    {/if}
  </WidgetBody>
</Widget>

<NeedsYouSheet open={sheetOpen} {items} {openCount} {timeZone} onClose={() => (sheetOpen = false)} />
