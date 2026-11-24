<script lang="ts">
  import { workspaceQueries } from '@base/features/workspace';
  import { Permission, RequirePermission } from '@platform/authz';
  import { contextStore, navigateTo } from '@platform/context';
  import { createQuery, Redirect, routeParams } from '@scylla/core-sdk';
  import { t } from '@scylla/ui/i18n';
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from '@scylla/ui/primitives';
  import { toRune } from '@scylla/ui/stores';
  import { notificationMessages as messages } from '../../messages/notifications.messages.ts';
  import FailedRuns from './FailedRuns.svelte';
  import {
    filterHidesRows,
    notificationFilterOf,
    notificationView,
    notificationViewHref,
  } from './notification-views.registry.ts';
  import NotificationsInbox from './NotificationsInbox.svelte';
  import NotificationsNav from './NotificationsNav.svelte';

  /** The value of the select with no filter. */
  const ALL = 'all';

  interface Props {
    /** Absent on the `personal` mount (`/notifications/<view>`). */
    workspaceSlug?: string;
    view?: string;
  }

  let { workspaceSlug, view }: Props = $props();

  const context = toRune(contextStore);
  const workspace = $derived(context().workspace);
  const workspaces = createQuery(() => workspaceQueries.mine());

  let workspaceId = $state(ALL);

  // The view changes inside the page (`inPageParams`): read it from the route, not the props.
  const current = $derived(notificationView(routeParams().view ?? view));
  // The failed runs are those of a workspace: the personal mount has none.
  const known = $derived(current && (current.filter || workspaceSlug) ? current : undefined);
  const workspaceName = $derived(workspaces.data?.find(item => item.id === workspaceId)?.name);

  const clearFilter = () => {
    workspaceId = ALL;
    if (known?.filter && filterHidesRows(notificationFilterOf(known.filter, null))) {
      navigateTo(notificationViewHref(workspaceSlug, 'inbox'));
    }
  };
</script>

{#if !known}
  <Redirect to="../inbox" />
{:else}
  <div class="flex w-full max-w-4xl flex-col gap-6 pb-20 md:flex-row md:items-start md:gap-10">
    <!-- In a workspace, the second sidebar of the shell has these links. -->
    {#if !workspaceSlug}
      <NotificationsNav current={known.id} />
    {/if}

    <div class="flex min-w-0 flex-1 flex-col gap-4">
      <header class="flex flex-wrap items-center justify-between gap-3">
        <h1>{t(messages.title)}</h1>
        {#if known.filter}
          <Select type="single" bind:value={workspaceId}>
            <SelectTrigger aria-label={t(messages.workspace)} class="w-56">
              <SelectValue>{workspaceName ?? t(messages.allWorkspaces)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL} label={t(messages.allWorkspaces)}>
                {t(messages.allWorkspaces)}
              </SelectItem>
              {#each workspaces.data ?? [] as item (item.id)}
                <SelectItem value={item.id} label={item.name}>{item.name}</SelectItem>
              {/each}
            </SelectContent>
          </Select>
        {/if}
      </header>

      {#if known.filter}
        <!-- A new list starts on its first page, with no selection. -->
        {#key `${known.id}:${workspaceId}`}
          <NotificationsInbox
            filter={notificationFilterOf(known.filter, workspaceId === ALL ? null : workspaceId)}
            slug={workspace.slug}
            onClearFilter={clearFilter}
          />
        {/key}
      {:else if workspace.id && workspace.slug}
        <RequirePermission
          permission={Permission.LIST_JOBS_BY_WORKSPACE}
          target={{ workspaceId: workspace.id }}
        >
          <FailedRuns workspaceId={workspace.id} slug={workspace.slug} />
        </RequirePermission>
      {/if}
    </div>
  </div>
{/if}
