<script lang="ts">
  import { fade } from 'svelte/transition';
  import { t } from '@scylla/ui/i18n';
  import { Button, Skeleton } from '@scylla/ui/primitives';
  import { cn } from '@scylla/ui/utils';
  import type { NotificationEntity } from '../../../domain/entities/notification.entity.ts';
  import { notificationMessages as messages } from '../../messages/notifications.messages.ts';
  import { compactSectionsOf, sectionsOf } from '../../presenters/sections.ts';
  import NotificationRow from './NotificationRow.svelte';

  /** Only the opacity changes, so a reduced motion keeps it. */
  const FADE = { duration: 150 };

  interface Props {
    rows: readonly NotificationEntity[];
    isLoading: boolean;
    /** The skeleton has the layout of a row: give the rows that the list will show. */
    skeletonRows?: number;
    isError: boolean;
    onRetry: () => void;
    /** `true` if a filter can hide rows. */
    filtered?: boolean;
    onClearFilter?: () => void;
    slug: string | null;
    onNavigate?: () => void;
    /** In the panel: no time labels, and the short form of a row. */
    compact?: boolean;
    /** On the full page: the selection of the rows. */
    isSelected?: (id: string) => boolean;
    onToggleSelect?: (id: string) => void;
    /** On the full page: the row that the keys act on. */
    activeId?: string | null;
  }

  let {
    rows,
    isLoading,
    skeletonRows = 4,
    isError,
    onRetry,
    filtered = false,
    onClearFilter,
    slug,
    onNavigate,
    compact = false,
    isSelected,
    onToggleSelect,
    activeId = null,
  }: Props = $props();

  const sections = $derived(compact ? compactSectionsOf(rows) : sectionsOf(rows));
</script>

<!-- One grid cell: the leaving skeleton and the arriving list cross-fade in place. -->
<div class="grid grid-cols-1 *:col-start-1 *:row-start-1">
  {#if isLoading}
    <div class="flex flex-col" role="status" out:fade={FADE}>
      {#each { length: skeletonRows }, index (index)}
        <div data-testid="notification-skeleton" class="flex items-start gap-2">
          {#if onToggleSelect}
            <Skeleton class="mt-2.5 size-4 shrink-0" />
          {/if}
          <div class="flex min-w-0 flex-1 gap-2 p-2">
            <span class="size-2 shrink-0"></span>
            <Skeleton class="mt-0.5 size-4 shrink-0" />
            <Skeleton class="my-0.5 h-4 flex-1" />
            <Skeleton class="my-0.5 h-3 w-10 shrink-0" />
          </div>
        </div>
      {/each}
    </div>
  {:else if isError}
    <div class="flex flex-col items-center gap-2 px-2 py-6 text-center text-sm" in:fade={FADE}>
      <p class="text-muted-foreground">{t(messages.loadFailed)}</p>
      <Button variant="outline" size="sm" onclick={onRetry}>{t(messages.tryAgain)}</Button>
    </div>
  {:else if rows.length === 0}
    <div class="flex flex-col items-center gap-2 px-2 py-6 text-center text-sm" in:fade={FADE}>
      {#if filtered}
        <p class="text-muted-foreground">{t(messages.emptyFilter)}</p>
        <Button variant="outline" size="sm" onclick={onClearFilter}>{t(messages.clearFilter)}</Button>
      {:else}
        <p class="text-muted-foreground">{t(messages.empty)}</p>
      {/if}
    </div>
  {:else}
    <div class="flex flex-col gap-2" in:fade={FADE}>
      {#each sections as section, index (section.id)}
        <section>
          {#if section.title}
            <h3
              class={cn(
                'py-1 text-xs text-muted-foreground uppercase',
                onToggleSelect ? 'pr-2 pl-6' : 'px-2',
              )}
            >
              {t(section.title)}
            </h3>
          {:else if index > 0}
            <hr class="mx-2 mb-1" />
          {/if}
          <ul class="flex flex-col">
            {#each section.rows as row (row.id)}
              <NotificationRow
                {row}
                {slug}
                {onNavigate}
                {compact}
                selected={isSelected?.(row.id) ?? false}
                onToggleSelect={onToggleSelect ? () => onToggleSelect(row.id) : undefined}
                active={activeId === row.id}
              />
            {/each}
          </ul>
        </section>
      {/each}
    </div>
  {/if}
</div>
