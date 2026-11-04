<script lang="ts">
  import type { Component, Snippet } from 'svelte';
  import Building2Icon from '@lucide/svelte/icons/building-2';
  import PencilIcon from '@lucide/svelte/icons/pencil';
  import TrashIcon from '@lucide/svelte/icons/trash';
  import UsersIcon from '@lucide/svelte/icons/users';
  import { can, Permission } from '@platform/authz';
  import { navigateTo, contextStore, workspaceUrl } from '@platform/context';
  import { createMutation, createQuery } from '@scylla/core-sdk';
  import { Skeleton } from '@scylla/ui/primitives';
  import {
    ConfirmOperationAlertDialog,
    ContextItem,
    IconButton,
  } from '@scylla/ui';
  import { toRune } from '@scylla/ui/stores';
  import { t } from '@scylla/ui/i18n';
  import {
    workspaceMutations,
    workspaceQueries,
  } from '@base/features/workspace/presentation/workspace.queries.ts';
  import { workspaceMessages } from '@base/features/workspace/presentation/messages/workspace.messages.ts';
  import EditWorkspaceDialog from '../EditWorkspaceDialog/EditWorkspaceDialog.svelte';
  import WorkspaceRow from './WorkspaceRow.svelte';

  type RowProps = {
    class?: string;
    onSelect?: () => void;
    children?: Snippet;
  };

  let { row: Row = WorkspaceRow }: { row?: Component<RowProps> } = $props();

  const workspacesQuery = createQuery(() => workspaceQueries.mine());
  const workspaces = $derived(workspacesQuery.data);

  const deleteWorkspace = createMutation(() => workspaceMutations.remove());

  const context = toRune(contextStore);
  const currentWorkspaceId = $derived(context().workspace.id);

  let editWorkspace = $state<{ id: string; name: string; slug: string } | null>(null);
  let deleteWorkspaceId = $state<string | null>(null);

  const selectWorkspace = (id: string, name: string, slug: string) => {
    contextStore.getState().setWorkspace(id, name, slug);
    navigateTo(workspaceUrl(slug));
  };

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
      <div class="flex items-center gap-3 px-1 py-1">
        <Skeleton class="h-8 w-8 rounded-md" />
        <Skeleton class="h-4 w-24" />
      </div>
    </Row>
  {/each}
{:else}
  {#each workspaces as workspace (workspace.id)}
    <Row
      class="group rounded-md transition-colors hover:bg-accent/70"
      onSelect={() => selectWorkspace(workspace.id, workspace.name, workspace.slug)}
    >
      <div class="flex w-full items-center">
        <div class="min-w-0 flex-1">
          <ContextItem
            name={workspace.name}
            description={workspace.slug}
            icon={Building2Icon}
          />
        </div>
        <div class="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          {#if can(Permission.LIST_WORKSPACE_MEMBERS, { workspaceId: workspace.id })}
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
              class="h-7 w-7"
              iconClass="h-3.5 w-3.5"
            />
          {/if}
          {#if can(Permission.UPDATE_WORKSPACE, { workspaceId: workspace.id })}
            <IconButton
              icon={PencilIcon}
              tooltip={t(workspaceMessages.edit)}
              onclick={event => {
                event.stopPropagation();
                editWorkspace = {
                  id: workspace.id,
                  name: workspace.name,
                  slug: workspace.slug,
                };
              }}
              class="h-7 w-7"
              iconClass="h-3.5 w-3.5"
            />
          {/if}
          {#if can(Permission.DELETE_WORKSPACE, { workspaceId: workspace.id })}
            <IconButton
              icon={TrashIcon}
              tooltip={t(workspaceMessages.delete)}
              onclick={event => {
                event.stopPropagation();
                deleteWorkspaceId = workspace.id;
              }}
              class="h-7 w-7 hover:bg-destructive-subtle hover:text-destructive"
              iconClass="h-3.5 w-3.5"
            />
          {/if}
        </div>
      </div>
    </Row>
  {/each}
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
