<script lang="ts">
  import { contextStore, currentSearch, navigateTo, workspaceUrl } from '@platform/context';
  import { DataTable, ErrorState, ListSkeleton, Pagination, pageIn, unfold } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import {
    Input,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from '@scylla/ui/primitives';
  import { Identity } from '@shared/presentation/ui';
  import { formatDay, getRelativeTime } from '@shared/utils/date-utils.ts';
  import type {
    WorkspaceEntity,
    WorkspaceOrder,
  } from '@base/features/workspace/domain/entities/workspace.entity.ts';
  import { workspaceAdminMessages as messages } from '@base/features/workspace/presentation/messages/workspace-admin.messages.ts';
  import WorkspaceIcon from '../WorkspaceIcon/WorkspaceIcon.svelte';
  import { workspaceColumns } from './workspace-admin.columns.ts';
  import { createWorkspaceAdmin } from './workspace-admin.state.svelte.ts';

  // The switcher gives the text of its search: `?q=`.
  const admin = createWorkspaceAdmin(new URLSearchParams(currentSearch()).get('q') ?? '');
  const list = admin.list;
  const items = $derived(list.data?.items ?? []);

  const ORDERS: { value: WorkspaceOrder; label: string }[] = [
    { value: 'name', label: t(messages.orderName) },
    { value: 'newest', label: t(messages.orderNewest) },
    { value: 'oldest', label: t(messages.orderOldest) },
    { value: 'activity', label: t(messages.orderActivity) },
  ];
  const orderLabel = $derived(ORDERS.find(order => order.value === admin.order)?.label);

  /** The same switch as the switcher: the workspace becomes the active one. */
  const open = (workspace: WorkspaceEntity) => {
    contextStore.getState().setWorkspace(workspace.id, workspace.name, workspace.slug);
    navigateTo(workspaceUrl(workspace.slug));
  };

  const columns = $derived(
    workspaceColumns({
      name: nameCell,
      owner: ownerCell,
      members: membersCell,
      projects: projectsCell,
      created: createdCell,
      lastActivity: lastActivityCell,
    }),
  );
</script>

{#snippet nameCell(workspace: WorkspaceEntity)}
  <span class="flex min-w-0 items-center gap-2">
    <WorkspaceIcon icon={workspace.icon} size={20} />
    <!-- A real button: the keyboard opens the workspace, and the click does not reach the row. -->
    <button
      type="button"
      class="block min-w-0 truncate rounded-sm text-left text-sm font-medium outline-hidden hover:underline focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={t(messages.openWorkspace(workspace.name))}
      title={workspace.slug}
      onclick={event => {
        event.stopPropagation();
        open(workspace);
      }}
    >
      {workspace.name}
    </button>
  </span>
{/snippet}

{#snippet ownerCell(workspace: WorkspaceEntity)}
  {#if workspace.owner}
    <Identity profile={workspace.owner} class="w-full" />
  {:else}
    <span class="text-xs text-muted-foreground">{t(messages.noOwner)}</span>
  {/if}
{/snippet}

{#snippet membersCell(workspace: WorkspaceEntity)}
  <span class="tabular-nums">{workspace.memberCount ?? 0}</span>
{/snippet}

{#snippet projectsCell(workspace: WorkspaceEntity)}
  <span class="tabular-nums">{workspace.projectCount ?? 0}</span>
{/snippet}

{#snippet createdCell(workspace: WorkspaceEntity)}
  <span class="block truncate text-xs text-muted-foreground">
    {workspace.createdAt ? formatDay(workspace.createdAt.toISOString()) : ''}
  </span>
{/snippet}

{#snippet lastActivityCell(workspace: WorkspaceEntity)}
  <span class="block truncate text-xs text-muted-foreground">
    {workspace.lastActivityAt
      ? getRelativeTime(workspace.lastActivityAt.toISOString())
      : t(messages.noActivity)}
  </span>
{/snippet}

<div class="flex w-full flex-col gap-6 pb-20">
  <header class="flex flex-col gap-2">
    <h1>{t(messages.title)}</h1>
    <p class="max-w-3xl text-sm text-muted-foreground">{t(messages.hint)}</p>
  </header>

  <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
    <Input
      class="md:w-72"
      type="search"
      placeholder={t(messages.search)}
      aria-label={t(messages.search)}
      autocomplete="off"
      value={admin.query}
      oninput={event => (admin.query = event.currentTarget.value)}
    />
    <Select
      type="single"
      value={admin.order}
      onValueChange={value => {
        if (value) admin.order = value as WorkspaceOrder;
      }}
    >
      <SelectTrigger class="w-full md:w-48" aria-label={t(messages.order)}>
        <SelectValue placeholder={t(messages.order)}>{orderLabel}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {#each ORDERS as order (order.value)}
          <SelectItem value={order.value} label={order.label}>{order.label}</SelectItem>
        {/each}
      </SelectContent>
    </Select>
  </div>

  {#if list.isPending}
    <ListSkeleton header rows={6} rowClass="h-12 w-full" />
  {:else if list.isError}
    <ErrorState message={t(messages.loadError)} />
  {:else}
    {#key list.data}
      <div
        class="flex flex-col gap-3 transition-opacity motion-reduce:transition-none"
        class:opacity-60={list.isPlaceholderData}
        in:pageIn
      >
        {#if items.length === 0}
          <p role="status" class="py-10 text-center text-sm text-muted-foreground" in:unfold>
            {t(messages.noWorkspace)}
          </p>
        {:else}
          <DataTable
            {columns}
            data={items}
            getRowId={workspace => workspace.id}
            onRowClick={row => open(row.original)}
            alignRowsCenter
          />
        {/if}
      </div>
    {/key}
    {#if admin.pagination.totalCount > 0}
      <Pagination paginationInfo={admin.pagination} onPageChange={page => admin.goTo(page)} />
    {/if}
  {/if}
</div>
