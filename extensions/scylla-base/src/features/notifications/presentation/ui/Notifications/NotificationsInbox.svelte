<script lang="ts">
  import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
  import { t } from '@scylla/ui/i18n';
  import { Button, Checkbox, Label } from '@scylla/ui/primitives';
  import type { NotificationFilter } from '../../../domain/entities/notification.entity.ts';
  import { notificationMessages as messages } from '../../messages/notifications.messages.ts';
  import NotificationList from '../NotificationRow/NotificationList.svelte';
  import { filterHidesRows } from './notification-views.registry.ts';
  import { NotificationsPageState } from './notifications.state.svelte.ts';

  interface Props {
    filter: NotificationFilter;
    /** The active workspace, or `null` outside a workspace. */
    slug: string | null;
    onClearFilter: () => void;
  }

  let { filter, slug, onClearFilter }: Props = $props();

  const page = new NotificationsPageState(
    () => filter,
    () => slug,
  );
</script>

<svelte:window onkeydown={page.onKey} />

{#if page.rows.length > 0}
  <div class="flex min-h-9 flex-wrap items-center gap-2 border-b pb-2">
    <Label class="flex items-center gap-2 pr-2 text-sm font-normal">
      <Checkbox checked={page.allSelected} onCheckedChange={page.toggleAll} />
      {t(messages.selectAll)}
    </Label>
    {#if page.selected.size > 0}
      <Button variant="outline" size="sm" onclick={() => page.markSelected(true)}>
        {t(messages.markRead)}
      </Button>
      <Button variant="outline" size="sm" onclick={() => page.setSelectedDone(!filter.done)}>
        {t(filter.done ? messages.putBack : messages.markDone)}
      </Button>
    {/if}
  </div>
{/if}

<NotificationList
  rows={page.rows}
  isLoading={page.isLoading}
  isError={page.isError}
  onRetry={page.retry}
  filtered={filterHidesRows(filter)}
  {onClearFilter}
  {slug}
  isSelected={id => page.selected.has(id)}
  onToggleSelect={page.toggle}
  activeId={page.activeId}
/>

{#if page.hasPrevious || page.hasNext}
  <div class="flex justify-end gap-2">
    <Button
      variant="outline"
      size="icon"
      aria-label={t(messages.previousPage)}
      disabled={!page.hasPrevious}
      onclick={page.previousPage}
    >
      <ChevronLeftIcon class="size-4" aria-hidden="true" />
    </Button>
    <Button
      variant="outline"
      size="icon"
      aria-label={t(messages.nextPage)}
      disabled={!page.hasNext}
      onclick={page.nextPage}
    >
      <ChevronRightIcon class="size-4" aria-hidden="true" />
    </Button>
  </div>
{/if}
