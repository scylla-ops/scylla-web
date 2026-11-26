<script lang="ts">
  import ArrowDownIcon from '@lucide/svelte/icons/arrow-down';
  import ArrowUpIcon from '@lucide/svelte/icons/arrow-up';
  import CopyIcon from '@lucide/svelte/icons/copy';
  import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
  import PaletteIcon from '@lucide/svelte/icons/palette';
  import PencilIcon from '@lucide/svelte/icons/pencil';
  import PinIcon from '@lucide/svelte/icons/pin';
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
  import {
    homeOf,
    PINS,
    type SectionKey,
  } from '@base/features/project/presentation/presenters/project-sections.presenter.ts';
  import { projectGroupMutations } from '../../project-group.queries.ts';
  import { projectMutations } from '../../project.queries.ts';
  import EditProjectDialog from '../EditProjectDialog.svelte';
  import ProjectIconDialog from '../ProjectIconDialog/ProjectIconDialog.svelte';
  import { getProjectLayout } from '../project-layout.context.ts';
  import NewGroupDialog from './NewGroupDialog.svelte';
  import ProjectGroupSubmenu from './ProjectGroupSubmenu.svelte';

  interface Props {
    project: ProjectEntity;
    /** The section of the card on the projects page. */
    section?: SectionKey;
    /** Hidden at rest on a screen with a mouse: the card shows it on hover and on focus. */
    class?: string;
  }

  let { project, section, class: className }: Props = $props();

  const layout = getProjectLayout();

  const canEdit = $derived(can(Permission.UPDATE_PROJECT, { projectId: project.id }));
  const canDelete = $derived(can(Permission.DELETE_PROJECT, { projectId: project.id }));
  const canCreate = $derived(can(Permission.CREATE_PROJECT, { workspaceId: project.workspaceId }));
  const pinned = $derived(layout?.isPinned(project.id) ?? false);
  // The order of the pins belongs to the person; the order of a group needs the edit right.
  const arranges = $derived(
    !!layout?.canArrange && section !== undefined && (section === PINS || canEdit),
  );
  const neighbors = $derived(
    arranges && section !== undefined ? layout?.neighbors(section, project.id) : undefined,
  );

  const deleteProject = createMutation(() => projectMutations.remove());
  const duplicateProject = createMutation(() => projectGroupMutations.duplicate());

  let editOpen = $state(false);
  let iconOpen = $state(false);
  let newGroupOpen = $state(false);
  let deleteOpen = $state(false);

  const confirmDelete = () =>
    deleteProject.mutate(project.id, { onSettled: () => (deleteOpen = false) });
  // The copy comes just after the project, in its group.
  const duplicate = () =>
    duplicateProject.mutate({
      project,
      beforeId: layout?.neighbors(homeOf(project.groupId), project.id).next,
    });

  const head = $derived(!!layout || canEdit);
  const moves = $derived((!!layout && canEdit) || arranges);
  const edits = $derived(canEdit || (!!layout && canCreate));
</script>

<!-- The actions of one project: the pin, the icon, the group and the place, the edit, the delete. -->
{#if head || moves || edits || canDelete}
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
      {#if layout}
        <DropdownMenuItem onSelect={() => layout.togglePin(project.id)}>
          <PinIcon class="size-4" aria-hidden="true" />
          {t(pinned ? projectMessages.unpin : projectMessages.pin)}
        </DropdownMenuItem>
      {/if}
      {#if canEdit}
        <DropdownMenuItem onSelect={() => (iconOpen = true)}>
          <PaletteIcon class="size-4" aria-hidden="true" />
          {t(projectMessages.changeIcon)}
        </DropdownMenuItem>
      {/if}

      {#if head && moves}<DropdownMenuSeparator />{/if}
      {#if layout && canEdit}
        <ProjectGroupSubmenu
          {project}
          groups={layout.groups}
          onNewGroup={() => (newGroupOpen = true)}
        />
      {/if}
      {#if arranges && section !== undefined && layout}
        <DropdownMenuItem
          disabled={!neighbors?.previous}
          onSelect={() => layout.moveUp(section, project)}
        >
          <ArrowUpIcon class="size-4" aria-hidden="true" />
          {t(projectMessages.moveUp)}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!neighbors?.next}
          onSelect={() => layout.moveDown(section, project)}
        >
          <ArrowDownIcon class="size-4" aria-hidden="true" />
          {t(projectMessages.moveDown)}
        </DropdownMenuItem>
      {/if}

      {#if (head || moves) && edits}<DropdownMenuSeparator />{/if}
      {#if canEdit}
        <DropdownMenuItem onSelect={() => (editOpen = true)}>
          <PencilIcon class="size-4" aria-hidden="true" />
          {t(projectMessages.editTitle)}
        </DropdownMenuItem>
      {/if}
      {#if layout && canCreate}
        <DropdownMenuItem disabled={duplicateProject.isPending} onSelect={duplicate}>
          <CopyIcon class="size-4" aria-hidden="true" />
          {t(projectMessages.duplicate)}
        </DropdownMenuItem>
      {/if}

      {#if (head || moves || edits) && canDelete}<DropdownMenuSeparator />{/if}
      {#if canDelete}
        <DropdownMenuItem variant="destructive" onSelect={() => (deleteOpen = true)}>
          <Trash2Icon class="size-4" aria-hidden="true" />
          {t(projectMessages.delete)}
        </DropdownMenuItem>
      {/if}
    </DropdownMenuContent>
  </DropdownMenu>

  <EditProjectDialog open={editOpen} setOpen={open => (editOpen = open)} {project} />
  {#if canEdit}
    <ProjectIconDialog open={iconOpen} onOpenChange={open => (iconOpen = open)} {project} />
  {/if}
  {#if layout && canEdit}
    <NewGroupDialog open={newGroupOpen} setOpen={open => (newGroupOpen = open)} {project} />
  {/if}
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
