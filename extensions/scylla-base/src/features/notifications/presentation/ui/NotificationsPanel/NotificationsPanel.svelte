<script lang="ts">
  import { can, Permission } from '@platform/authz';
  import { contextStore, navigateTo, workspaceUrl } from '@platform/context';
  import { createMutation, createQuery } from '@scylla/core-sdk';
  import { t } from '@scylla/ui/i18n';
  import { Button, ToggleGroup, ToggleGroupItem } from '@scylla/ui/primitives';
  import { toRune } from '@scylla/ui/stores';
  import type { NotificationFilter } from '../../../domain/entities/notification.entity.ts';
  import { notificationMessages as messages } from '../../messages/notifications.messages.ts';
  import { notificationMutations, notificationQueries } from '../../notifications.queries.ts';
  import NotificationList from '../NotificationRow/NotificationList.svelte';
  import FailedRuns from './FailedRuns.svelte';

  const PANEL_SIZE = 20;

  type Scope = 'all' | 'unread' | 'workspace';
  type Tab = 'notifications' | 'failed-runs';

  let { onNavigate }: { onNavigate: () => void } = $props();

  const context = toRune(contextStore);
  const workspace = $derived(context().workspace);

  let tab = $state<Tab>('notifications');
  let scope = $state<Scope>('all');

  const filter = $derived<NotificationFilter>({
    done: false,
    unreadOnly: scope === 'unread',
    needsActionOnly: false,
    workspaceId: scope === 'workspace' ? workspace.id : null,
    category: '',
  });

  const list = createQuery(() => notificationQueries.list(filter, PANEL_SIZE));
  const markAll = createMutation(() => notificationMutations.markAllRead());

  const canSeeRuns = $derived(
    !!workspace.id &&
      !!workspace.slug &&
      can(Permission.LIST_JOBS_BY_WORKSPACE, { workspaceId: workspace.id }),
  );

  const allHref = $derived(
    workspace.slug ? workspaceUrl(workspace.slug, 'notifications') : '/notifications',
  );

  const openAll = (event: MouseEvent) => {
    event.preventDefault();
    navigateTo(allHref);
    onNavigate();
  };
</script>

<div class="flex max-h-[min(36rem,80vh)] flex-col">
  <header class="flex items-center justify-between gap-2 px-3 pt-3 pb-2">
    <h2 class="text-sm">{t(messages.title)}</h2>
    {#if tab === 'notifications'}
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

  {#if canSeeRuns}
    <div class="px-3 pb-2">
      <ToggleGroup
        type="single"
        value={tab}
        onValueChange={next => {
          if (next) tab = next as Tab;
        }}
      >
        <ToggleGroupItem value="notifications">{t(messages.tabNotifications)}</ToggleGroupItem>
        <ToggleGroupItem value="failed-runs">{t(messages.tabFailedRuns)}</ToggleGroupItem>
      </ToggleGroup>
    </div>
  {/if}

  {#if tab === 'notifications' || !canSeeRuns}
    <div class="px-3 pb-2">
      <ToggleGroup
        type="single"
        value={scope}
        onValueChange={next => {
          if (next) scope = next as Scope;
        }}
      >
        <ToggleGroupItem value="all">{t(messages.filterAll)}</ToggleGroupItem>
        <ToggleGroupItem value="unread">{t(messages.filterUnread)}</ToggleGroupItem>
        {#if workspace.id}
          <ToggleGroupItem value="workspace">{t(messages.filterWorkspace)}</ToggleGroupItem>
        {/if}
      </ToggleGroup>
    </div>
    <div class="relative min-h-0 flex-1 overflow-y-auto px-1 pb-1">
      <NotificationList
        rows={list.data?.items ?? []}
        isLoading={list.isLoading}
        isError={list.isError}
        onRetry={() => list.refetch()}
        filtered={scope !== 'all'}
        onClearFilter={() => (scope = 'all')}
        slug={workspace.slug}
        {onNavigate}
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
  {:else if workspace.id && workspace.slug}
    <div class="relative min-h-0 flex-1 overflow-y-auto px-1 pb-1">
      <FailedRuns workspaceId={workspace.id} slug={workspace.slug} {onNavigate} />
    </div>
  {/if}
</div>
