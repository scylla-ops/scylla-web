<script lang="ts">
  import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
  import PencilIcon from '@lucide/svelte/icons/pencil';
  import Trash2Icon from '@lucide/svelte/icons/trash-2';
  import { can, Permission } from '@platform/authz';
  import { createMutation } from '@scylla/core-sdk';
  import { ConfirmOperationAlertDialog } from '@scylla/ui';
  import {
    buttonVariants,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import type { ProjectEntity } from '@base/features/project/domain/entities/project.entity.ts';
  import { projectMessages } from '@base/features/project/presentation/messages/project.messages.ts';
  import { projectMutations } from '../../project.queries.ts';
  import EditProjectDialog from '../EditProjectDialog.svelte';

  interface Props {
    project: ProjectEntity;
    /** Hidden at rest on a screen with a mouse: the card shows it on hover and on focus. */
    class?: string;
  }

  let { project, class: className }: Props = $props();

  const canEdit = $derived(can(Permission.UPDATE_PROJECT, { projectId: project.id }));
  const canDelete = $derived(can(Permission.DELETE_PROJECT, { projectId: project.id }));

  const deleteProject = createMutation(() => projectMutations.remove());

  let editOpen = $state(false);
  let deleteOpen = $state(false);

  const confirmDelete = () =>
    deleteProject.mutate(project.id, { onSettled: () => (deleteOpen = false) });
</script>

<!-- The actions of one project. The groups and the pins add theirs here. -->
{#if canEdit || canDelete}
  <DropdownMenu>
    <DropdownMenuTrigger
      class={cn(
        buttonVariants({ variant: 'ghost', size: 'icon' }),
        'size-8 rounded-full max-md:size-11',
        className,
      )}
      onclick={(event: MouseEvent) => event.stopPropagation()}
    >
      <EllipsisIcon class="size-4" aria-hidden="true" />
      <span class="sr-only">{t(projectMessages.projectMenu)}</span>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="w-60">
      {#if canEdit}
        <DropdownMenuItem onSelect={() => (editOpen = true)}>
          <PencilIcon class="size-4" aria-hidden="true" />
          {t(projectMessages.editTitle)}
        </DropdownMenuItem>
      {/if}
      {#if canEdit && canDelete}
        <DropdownMenuSeparator />
      {/if}
      {#if canDelete}
        <DropdownMenuItem variant="destructive" onSelect={() => (deleteOpen = true)}>
          <Trash2Icon class="size-4" aria-hidden="true" />
          {t(projectMessages.delete)}
        </DropdownMenuItem>
      {/if}
    </DropdownMenuContent>
  </DropdownMenu>

  <EditProjectDialog open={editOpen} setOpen={open => (editOpen = open)} {project} />
  <ConfirmOperationAlertDialog
    open={deleteOpen}
    onOpenChange={open => (deleteOpen = open)}
    onContinue={confirmDelete}
    title={t(projectMessages.deleteTitle(project.name))}
    description={t(projectMessages.deleteBody)}
    continueLabel={t(projectMessages.delete)}
    isLoading={deleteProject.isPending}
  />
{/if}
