<script lang="ts">
  import { contextStore, navigateTo } from '@platform/context';
  import { createMutation, createQuery } from '@scylla/core-sdk';
  import { t } from '@scylla/ui/i18n';
  import { Button } from '@scylla/ui/primitives';
  import { toRune } from '@scylla/ui/stores';
  import { notificationMessages as messages } from '../../messages/notifications.messages.ts';
  import { notificationMutations, notificationQueries } from '../../notifications.queries.ts';
  import { canMarkAllRead } from '../../presenters/bell.presenter.ts';
  import NotificationList from '../NotificationRow/NotificationList.svelte';
  import {
    notificationFilterOf,
    notificationViewHref,
  } from '../Notifications/notification-views.registry.ts';

  const PANEL_SIZE = 20;
  const INBOX = notificationFilterOf({}, null);

  let { onNavigate }: { onNavigate: () => void } = $props();

  const context = toRune(contextStore);
  const workspace = $derived(context().workspace);

  const list = createQuery(() => notificationQueries.list(INBOX, PANEL_SIZE));
  const summary = createQuery(() => notificationQueries.summary());
  const markAll = createMutation(() => notificationMutations.markAllRead());

  const allHref = $derived(notificationViewHref(workspace.slug, 'inbox'));

  const openAll = (event: MouseEvent) => {
    event.preventDefault();
    navigateTo(allHref);
    onNavigate();
  };
</script>

<div class="flex max-h-[min(36rem,80vh)] flex-col">
  <header class="flex min-h-12 items-center justify-between gap-2 px-3 pt-3 pb-2">
    <h2 class="text-sm">{t(messages.title)}</h2>
    {#if summary.data && canMarkAllRead(summary.data)}
      <Button
        variant="ghost"
        size="sm"
        class="h-7 text-xs"
        disabled={markAll.isPending}
        onclick={() => markAll.mutate()}
      >
        {t(messages.markAllRead)}
      </Button>
    {/if}
  </header>
  <div class="relative min-h-0 flex-1 overflow-y-auto px-1 pb-1">
    <NotificationList
      rows={list.data?.items ?? []}
      isLoading={list.isLoading}
      isError={list.isError}
      onRetry={() => list.refetch()}
      slug={workspace.slug}
      {onNavigate}
      compact
    />
  </div>
  <footer class="border-t px-3 py-2 text-sm">
    <a
      href={allHref}
      onclick={openAll}
      class="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
    >
      {t(messages.allNotifications)}
    </a>
  </footer>
</div>
