<script lang="ts">
  import type { Component, Snippet } from 'svelte';
  import type { Attachment } from 'svelte/attachments';
  import { flip } from 'svelte/animate';
  import CheckIcon from '@lucide/svelte/icons/check';
  import LayoutListIcon from '@lucide/svelte/icons/layout-list';
  import PencilIcon from '@lucide/svelte/icons/pencil';
  import TrashIcon from '@lucide/svelte/icons/trash';
  import UsersIcon from '@lucide/svelte/icons/users';
  import { can, Permission } from '@platform/authz';
  import { imageUrl } from '@platform/grpc';
  import { navigateTo, contextStore, workspaceUrl } from '@platform/context';
  import { createMutation, createQuery } from '@scylla/core-sdk';
  import { Input, Skeleton } from '@scylla/ui/primitives';
  import { ConfirmOperationAlertDialog, IconButton, fold, motionDuration, unfold } from '@scylla/ui';
  import { toRune } from '@scylla/ui/stores';
  import { t } from '@scylla/ui/i18n';
  import { matchesSearch } from '@scylla/ui/utils';
  import { IdentityAvatar, WorkspaceIcon } from '@shared/presentation/ui';
  import type { WorkspaceEntity } from '@base/features/workspace/domain/entities/workspace.entity.ts';
  import {
    workspaceMutations,
    workspaceQueries,
  } from '@base/features/workspace/presentation/workspace.queries.ts';
  import { workspaceMessages } from '@base/features/workspace/presentation/messages/workspace.messages.ts';
  import {
    OTHERS_LIMIT,
    SEARCH_DELAY_MS,
    allWorkspacesHref,
    ownerHint,
    ownerName,
    workspaceSearchFields,
  } from '@base/features/workspace/presentation/presenters/workspace-owner.presenter.ts';
  import EditWorkspaceDialog from '../EditWorkspaceDialog/EditWorkspaceDialog.svelte';
  import WorkspaceRow from './WorkspaceRow.svelte';
  import { createWorkspacePermissions } from './workspace-permissions.state.svelte.ts';

  type RowProps = {
    class?: string;
    onSelect?: () => void;
    children?: Snippet;
  };

  let { row: Row = WorkspaceRow }: { row?: Component<RowProps> } = $props();

  const workspacesQuery = createQuery(() => workspaceQueries.mine());
  const workspaces = $derived(workspacesQuery.data);
  const permissions = createWorkspacePermissions(
    () => workspaces?.map(workspace => workspace.id) ?? [],
  );

  /** Below this, all the rows show at once. */
  const FILTER_FROM = 6;
  let filter = $state('');
  let rowsArea = $state<HTMLElement | null>(null);

  /**
   * An instance admin sees its own workspaces first, then a few workspaces of the other users, the
   * last active first. The search of the others runs on the server, with the owner.
   */
  const seesAll = $derived(can(Permission.LIST_ALL_WORKSPACES));
  const shown = $derived(
    (workspaces ?? []).filter(workspace =>
      matchesSearch(
        filter,
        seesAll ? workspaceSearchFields(workspace) : [workspace.name, workspace.slug],
      ),
    ),
  );

  let searched = $state('');
  $effect(() => {
    const next = filter.trim();
    const timer = setTimeout(() => (searched = next), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  });
  const othersQuery = createQuery(() =>
    workspaceQueries.all(
      { query: searched, order: 'activity', othersOnly: true, pageSize: OTHERS_LIMIT, pageToken: '' },
      { enabled: seesAll },
    ),
  );
  const others = $derived(seesAll ? (othersQuery.data?.items ?? []) : []);
  const othersPending = $derived(seesAll && (othersQuery.isPending || searched !== filter.trim()));
  const flipMs = $derived(motionDuration(200));
  const HEADING = 'px-2 pt-1.5 pb-0.5 text-[11px] font-medium text-muted-foreground';

  // The rows can arrive after the menu took the focus.
  const takeFocus: Attachment<HTMLInputElement> = element => element.focus();

  // A letter stays in the field: the type-ahead of a menu moves the focus to a row.
  const onFilterKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' || event.key === 'Tab') return;
    event.stopPropagation();
    const first = rowsArea?.querySelector<HTMLElement>('[role="menuitem"]');
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      first?.focus();
    }
    if (event.key === 'Enter' && filter.trim()) {
      // Else the key goes on to the trigger, which takes the focus back and opens the menu again.
      event.preventDefault();
      first?.click();
    }
  };

  const deleteWorkspace = createMutation(() => workspaceMutations.remove());

  const context = toRune(contextStore);
  const currentWorkspaceId = $derived(context().workspace.id);

  let editWorkspace = $state<WorkspaceEntity | null>(null);
  let deleteWorkspaceId = $state<string | null>(null);

  const selectWorkspace = (id: string, name: string, slug: string) => {
    contextStore.getState().setWorkspace(id, name, slug);
    navigateTo(workspaceUrl(slug));
  };

  const ownerLabel = (workspace: WorkspaceEntity): string | undefined =>
    workspace.owner &&
    t(workspaceMessages.ownedBy(ownerName(workspace.owner), ownerHint(workspace.owner)));

  /** Deleting the current workspace moves the context to another one, or to none. */
  const onDeleteWorkspace = async () => {
    if (!deleteWorkspaceId) return;

    const deletedId = deleteWorkspaceId;
    await deleteWorkspace.mutateAsync(deletedId);
    deleteWorkspaceId = null;

    if (deletedId !== currentWorkspaceId) return;

    const other = workspaces?.find(workspace => workspace.id !== deletedId);
    contextStore
      .getState()
      .setWorkspace(other?.id ?? null, other?.name ?? null, other?.slug ?? null);
    if (other) navigateTo(workspaceUrl(other.slug));
  };
</script>

{#if !workspaces}
  {#each Array.from({ length: 3 }) as _, index (index)}
    <Row class="group">
      <div class="flex h-7 items-center gap-2 px-2">
        <Skeleton class="size-5 rounded-md" />
        <Skeleton class="h-4 w-24" />
      </div>
    </Row>
  {/each}
{:else}
  {#if seesAll || workspaces.length >= FILTER_FROM}
    {@const findLabel = t(
      seesAll ? workspaceMessages.findWorkspaceOrOwner : workspaceMessages.findWorkspace,
    )}
    <div class="px-1 pb-1">
      <Input
        class="h-7"
        autofocus
        {@attach takeFocus}
        placeholder={findLabel}
        aria-label={findLabel}
        autocomplete="off"
        bind:value={filter}
        onkeydown={onFilterKeydown}
      />
    </div>
  {/if}
  <div bind:this={rowsArea} class="relative max-h-64 overflow-y-auto">
    {#if seesAll && shown.length > 0}
      <p class={HEADING} transition:unfold>{t(workspaceMessages.yourWorkspaces)}</p>
    {/if}
    {#each shown as workspace (workspace.id)}
      <Row
        class="group h-7 rounded-md px-2 py-0 transition-colors hover:bg-accent/70 motion-reduce:transition-none"
        onSelect={() => selectWorkspace(workspace.id, workspace.name, workspace.slug)}
      >
        <div class="flex w-full min-w-0 items-center gap-2">
          <WorkspaceIcon icon={workspace.icon} {imageUrl} size={20} />
          <span class="min-w-0 flex-1 truncate text-sm" title={workspace.name}>{workspace.name}</span>
          {#if workspace.id === currentWorkspaceId}
            <CheckIcon
              class="size-4 shrink-0 text-foreground group-hover:hidden"
              aria-label={t(workspaceMessages.current)}
            />
          {/if}
          <!-- The actions of a row are not in the drawing: they show on hover, in place of the check. -->
          <div class="hidden gap-0.5 group-hover:flex">
            {#if permissions.can(Permission.LIST_WORKSPACE_MEMBERS, workspace.id)}
              <IconButton
                icon={UsersIcon}
                tooltip={t(workspaceMessages.members)}
                onclick={event => {
                  event.stopPropagation();
                  // The members page reads the workspace from the context.
                  contextStore
                    .getState()
                    .setWorkspace(workspace.id, workspace.name, workspace.slug);
                  navigateTo(workspaceUrl(workspace.slug, 'access/members'));
                }}
                class="size-6"
                iconClass="size-3.5"
              />
            {/if}
            {#if permissions.can(Permission.UPDATE_WORKSPACE, workspace.id)}
              <IconButton
                icon={PencilIcon}
                tooltip={t(workspaceMessages.edit)}
                onclick={event => {
                  event.stopPropagation();
                  editWorkspace = workspace;
                }}
                class="size-6"
                iconClass="size-3.5"
              />
            {/if}
            {#if permissions.can(Permission.DELETE_WORKSPACE, workspace.id)}
              <IconButton
                icon={TrashIcon}
                tooltip={t(workspaceMessages.delete)}
                onclick={event => {
                  event.stopPropagation();
                  deleteWorkspaceId = workspace.id;
                }}
                variant="destructive"
                class="size-6"
                iconClass="size-3.5"
              />
            {/if}
          </div>
        </div>
      </Row>
    {:else}
      {#if filter.trim() && !seesAll}
        <p role="status" class="px-2 py-1.5 text-sm text-muted-foreground">
          {t(workspaceMessages.noWorkspaceMatch)}
        </p>
      {/if}
    {/each}
    {#if others.length > 0}
      <div in:unfold out:fold data-testid="other-workspaces">
        <p class={HEADING}>{t(workspaceMessages.otherWorkspaces)}</p>
        {#each others as workspace (workspace.id)}
          <div animate:flip={{ duration: flipMs }} in:unfold out:fold>
            <Row
              class="group h-auto rounded-md px-2 py-1 transition-colors hover:bg-accent/70 motion-reduce:transition-none"
              onSelect={() => selectWorkspace(workspace.id, workspace.name, workspace.slug)}
            >
              <div class="flex w-full min-w-0 items-center gap-2" title={ownerLabel(workspace)}>
                <WorkspaceIcon icon={workspace.icon} {imageUrl} size={20} />
                <span class="flex min-w-0 flex-1 flex-col">
                  <span class="truncate text-sm">{workspace.name}</span>
                  {#if workspace.owner}
                    <span class="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                      <IdentityAvatar profile={workspace.owner} size={16} />
                      <span class="truncate">{ownerName(workspace.owner)}</span>
                      <span class="sr-only">{ownerHint(workspace.owner)}</span>
                    </span>
                  {/if}
                </span>
                {#if workspace.id === currentWorkspaceId}
                  <CheckIcon
                    class="size-4 shrink-0 text-foreground"
                    aria-label={t(workspaceMessages.current)}
                  />
                {/if}
              </div>
            </Row>
          </div>
        {/each}
      </div>
    {/if}
    {#if seesAll && filter.trim() && shown.length === 0 && others.length === 0 && !othersPending}
      <p role="status" class="px-2 py-1.5 text-sm text-muted-foreground" in:unfold>
        {t(workspaceMessages.noWorkspaceMatch)}
      </p>
    {/if}
  </div>
  {#if seesAll}
    <Row
      class="h-7 rounded-md px-2 py-0 transition-colors hover:bg-accent/70 motion-reduce:transition-none"
      onSelect={() => navigateTo(allWorkspacesHref(filter))}
    >
      <div class="flex w-full min-w-0 items-center gap-2">
        <LayoutListIcon class="size-4 shrink-0 text-muted-foreground" />
        <span class="min-w-0 flex-1 truncate text-sm">{t(workspaceMessages.allWorkspaces)}</span>
        {#if othersQuery.data && othersQuery.data.total > others.length}
          <span class="shrink-0 text-xs text-muted-foreground tabular-nums">
            {othersQuery.data.total}
          </span>
        {/if}
      </div>
    </Row>
  {/if}
{/if}

{#if editWorkspace}
  <EditWorkspaceDialog
    open={!!editWorkspace}
    setOpen={open => {
      if (!open) editWorkspace = null;
    }}
    workspace={editWorkspace}
  />
{/if}

<ConfirmOperationAlertDialog
  open={!!deleteWorkspaceId}
  onOpenChange={open => {
    if (!open) deleteWorkspaceId = null;
  }}
  onContinue={onDeleteWorkspace}
/>
