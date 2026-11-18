<script lang="ts">
  import type { Snippet } from 'svelte';
  import HistoryIcon from '@lucide/svelte/icons/history';
  import { Widget, type LucideIcon, type WidgetSize } from '@scylla/ui';
  import { Button, Dialog, DialogDescription, DialogTitle, SheetContent } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { widgetMessages } from '@base/features/dashboard/presentation/messages/widgets.messages.ts';
  import { activityMessages as messages } from '@base/features/dashboard/presentation/messages/activity.messages.ts';
  import { activityLine } from '@base/features/dashboard/presentation/presenters/activity.presenter.ts';
  import { clockIn } from '@base/features/dashboard/presentation/presenters/zoned-day.presenter.ts';
  import type { DashboardWidgets } from '../dashboard-widgets.state.svelte.ts';
  import WidgetBody from '../parts/WidgetBody.svelte';
  import ActivityRow from './ActivityRow.svelte';

  interface Props {
    widgets: DashboardWidgets;
    size?: WidgetSize;
    timeZone?: string;
    /** The controls of the edit mode, over the card. */
    editing?: Snippet;
  }

  let { widgets, size = 'm', timeZone = 'UTC', editing }: Props = $props();

  const ROWS: Readonly<Record<WidgetSize, number>> = { xs: 0, s: 5, m: 5, l: 10 };

  const feed = $derived(widgets.activityFeed.data);
  const lines = $derived((feed?.events ?? []).map(activityLine));
  const since = $derived(widgets.since);
  const sinceClock = $derived(since ? clockIn(new Date(since), timeZone) : null);
  const newCount = $derived(feed?.sinceCount ?? 0);
  const recent = $derived(since ? lines.filter(line => line.at >= since) : lines);
  const earlier = $derived(since ? lines.filter(line => line.at < since) : []);
  const shown = $derived(lines.slice(0, ROWS[size]));
  const recentShown = $derived(recent.slice(0, ROWS.l));
  const earlierShown = $derived(earlier.slice(0, Math.max(0, ROWS.l - recentShown.length)));

  let sheetOpen = $state(false);
</script>

{#snippet aside()}
  {#if size === 'xs'}
    {#if sinceClock}<span class="font-medium">{t(messages.sinceTime(sinceClock))}</span>{/if}
  {:else if newCount > 0}
    <span class="font-medium text-primary">{t(messages.newCount(newCount))}</span>
  {/if}
{/snippet}

<Widget
  {size}
  {editing}
  title={t(widgetMessages.activity)}
  icon={HistoryIcon as LucideIcon}
  meta={size === 'xs' ? undefined : t(messages.sinceVisit)}
  {aside}
>
  <WidgetBody
    {size}
    locked={widgets.activityLocked}
    loading={widgets.activityFeed.isPending && !widgets.activityLocked}
    error={widgets.activityFeed.isError && !widgets.activityLocked}
    onRetry={() => void widgets.activityFeed.refetch()}
    empty={!!feed && lines.length === 0}
    emptyTitle={t(messages.nothing)}
    emptyText={t(messages.nothingText)}
  >
    {#if size === 'xs'}
      <p data-part="activity" class="flex h-7 items-center gap-1.5">
        <span class="font-display text-xl font-medium tabular-nums">{newCount}</span>
        <span class="truncate text-xs text-muted-foreground">{t(messages.eventsSinceVisit)}</span>
      </p>
    {:else if size === 's' || size === 'm'}
      <ul data-part="activity" class="flex flex-col gap-1">
        {#each shown as line (line.id)}
          <ActivityRow {line} {timeZone} wide={size === 'm'} />
        {/each}
      </ul>
    {:else}
      <div data-part="activity" class="flex min-h-0 flex-1 flex-col gap-1">
        {#if sinceClock && recentShown.length > 0}
          <p class="flex items-center text-xs">
            <span class="font-medium text-primary">{t(messages.sinceVisitAt(sinceClock))}</span>
            <span class="ml-auto text-muted-foreground">{t(messages.events(newCount))}</span>
          </p>
        {/if}
        <ul class="flex flex-col gap-1">
          {#each recentShown as line (line.id)}<ActivityRow {line} {timeZone} wide />{/each}
        </ul>
        {#if earlierShown.length > 0}
          <p class="mt-2 text-xs text-muted-foreground">{t(messages.earlier)}</p>
          <ul class="flex flex-col gap-1">
            {#each earlierShown as line (line.id)}<ActivityRow {line} {timeZone} wide />{/each}
          </ul>
        {/if}
        <div class="mt-auto flex items-center gap-2 pt-2">
          <span class="truncate text-xs text-muted-foreground">{t(messages.readable)}</span>
          {#if lines.length > recentShown.length + earlierShown.length}
            <Button variant="ghost" size="xs" class="ml-auto text-primary" onclick={() => (sheetOpen = true)}>{t(messages.seeAll)}</Button>
          {/if}
        </div>
      </div>
    {/if}
  </WidgetBody>
</Widget>

<Dialog open={sheetOpen} onOpenChange={next => !next && (sheetOpen = false)}>
  <SheetContent side="right" overlayClass="bg-black/25" class="w-full gap-0 p-0 sm:max-w-[560px]">
    <header class="flex flex-col gap-1 border-b border-border px-5 py-4 pr-12">
      <DialogTitle>{t(widgetMessages.activity)}</DialogTitle>
      <DialogDescription class="text-xs">{t(messages.readable)}</DialogDescription>
    </header>
    <ul class="relative flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto px-5 py-4">
      {#each lines as line (line.id)}<ActivityRow {line} {timeZone} wide />{/each}
    </ul>
  </SheetContent>
</Dialog>
