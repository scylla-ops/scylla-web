<script lang="ts">
  import CheckIcon from '@lucide/svelte/icons/check';
  import FolderIcon from '@lucide/svelte/icons/folder';
  import FolderInputIcon from '@lucide/svelte/icons/folder-input';
  import FolderPlusIcon from '@lucide/svelte/icons/folder-plus';
  import { createMutation } from '@scylla/core-sdk';
  import {
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { toast } from '@scylla/ui/utils';
  import type { ProjectGroupEntity } from '@base/features/project/domain/entities/project-group.entity.ts';
  import type { ProjectEntity } from '@base/features/project/domain/entities/project.entity.ts';
  import { projectMessages } from '@base/features/project/presentation/messages/project.messages.ts';
  import { projectGroupMutations } from '../../project-group.queries.ts';

  interface Props {
    project: ProjectEntity;
    groups: readonly ProjectGroupEntity[];
    /** « New group… »: the dialog is out of the menu, so that it stays when the menu closes. */
    onNewGroup: () => void;
  }

  let { project, groups, onNewGroup }: Props = $props();

  const move = createMutation(() => projectGroupMutations.move());

  /** The project goes last in the group. */
  const moveTo = (groupId: string | undefined, name: string) => {
    if (groupId === project.groupId) return;
    move.mutate([{ id: project.id, groupId }], {
      onSuccess: () => toast.success(t(projectMessages.movedTo(name))),
    });
  };
</script>

{#snippet target(groupId: string | undefined, name: string)}
  <DropdownMenuItem onSelect={() => moveTo(groupId, name)}>
    <FolderIcon class="size-4" aria-hidden="true" />
    <span class="min-w-0 flex-1 truncate">{name}</span>
    {#if groupId === project.groupId}
      <CheckIcon class="size-4" aria-label={t(projectMessages.currentGroup)} />
    {/if}
  </DropdownMenuItem>
{/snippet}

<DropdownMenuSub>
  <DropdownMenuSubTrigger>
    <FolderInputIcon class="size-4" aria-hidden="true" />
    {t(projectMessages.moveToGroup)}
  </DropdownMenuSubTrigger>
  <DropdownMenuSubContent class="w-[200px]">
    {#each groups as group (group.id)}
      {@render target(group.id, group.name)}
    {/each}
    {@render target(undefined, t(projectMessages.ungrouped))}
    <DropdownMenuSeparator />
    <DropdownMenuItem onSelect={onNewGroup}>
      <FolderPlusIcon class="size-4" aria-hidden="true" />
      {t(projectMessages.newGroupMenu)}
    </DropdownMenuItem>
  </DropdownMenuSubContent>
</DropdownMenuSub>
