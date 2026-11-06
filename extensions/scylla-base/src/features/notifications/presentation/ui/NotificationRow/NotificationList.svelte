<script lang="ts">
  import { t } from '@scylla/ui/i18n';
  import { Button, Skeleton } from '@scylla/ui/primitives';
  import type { NotificationEntity } from '../../../domain/entities/notification.entity.ts';
  import { notificationMessages as messages } from '../../messages/notifications.messages.ts';
  import { sectionsOf } from '../../presenters/sections.ts';
  import NotificationRow from './NotificationRow.svelte';

  const SKELETON_ROWS = 4;

  interface Props {
    rows: readonly NotificationEntity[];
    isLoading: boolean;
    isError: boolean;
    onRetry: () => void;
    /** `true` if a filter can hide rows. */
    filtered: boolean;
    onClearFilter: () => void;
    slug: string | null;
    onNavigate?: () => void;
    /** On the full page: the selection of the rows. */
    isSelected?: (id: string) => boolean;
    onToggleSelect?: (id: string) => void;
    /** On the full page: the row that the keys act on. */
    activeId?: string | null;
  }

  let {
    rows,
    isLoading,
    isError,
    onRetry,
    filtered,
    onClearFilter,
    slug,
    onNavigate,
    isSelected,
    onToggleSelect,
    activeId = null,
  }: Props = $props();

  const sections = $derived(sectionsOf(rows));
</script>

{#if isLoading}
  <div class="flex flex-col gap-3 p-2" role="status">
    {#each { length: SKELETON_ROWS }, index (index)}
      <Skeleton class="h-10 w-full" />
    {/each}
  </div>
{:else if isError}
  <div class="flex flex-col items-center gap-2 px-2 py-6 text-center text-sm">
    <p class="text-muted-foreground">{t(messages.loadFailed)}</p>
    <Button variant="outline" size="sm" onclick={onRetry}>{t(messages.tryAgain)}</Button>
  </div>
{:else if rows.length === 0}
  <div class="flex flex-col items-center gap-2 px-2 py-6 text-center text-sm">
    {#if filtered}
      <p class="text-muted-foreground">{t(messages.emptyFilter)}</p>
      <Button variant="outline" size="sm" onclick={onClearFilter}>{t(messages.clearFilter)}</Button>
    {:else}
      <p class="text-muted-foreground">{t(messages.empty)}</p>
    {/if}
  </div>
{:else}
  <div class="flex flex-col gap-2">
    {#each sections as section (section.id)}
      <section>
        <h3 class="px-2 py-1 text-xs text-muted-foreground uppercase">
          {t(section.title)}
        </h3>
        <ul class="flex flex-col">
          {#each section.rows as row (row.id)}
            <NotificationRow
              {row}
              {slug}
              {onNavigate}
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
