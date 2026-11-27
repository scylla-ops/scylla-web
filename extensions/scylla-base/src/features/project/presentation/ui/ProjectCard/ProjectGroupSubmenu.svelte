<script lang="ts">
  import CheckIcon from '@lucide/svelte/icons/check';
  import FolderIcon from '@lucide/svelte/icons/folder';
  import FolderInputIcon from '@lucide/svelte/icons/folder-input';
  import FolderPlusIcon from '@lucide/svelte/icons/folder-plus';
  import PinIcon from '@lucide/svelte/icons/pin';
  import { createMutation } from '@scylla/core-sdk';
  import { ColorGlyph } from '@scylla/ui';
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
    /** The project is in the pins of the person. */
    pinned?: boolean;
    /** Pins the project. With `pinned`, the menu only says that it is pinned already. */
    onPin?: () => void;
  }

  let { project, groups, onNewGroup, pinned = false, onPin }: Props = $props();

  const move = createMutation(() => projectGroupMutations.move());

  /** The project goes last in the group. */
  const moveTo = (groupId: string | undefined, name: string) => {
    if (groupId === project.groupId) {
      toast.info(t(projectMessages.alreadyIn(name)));
      return;
    }
    move.mutate([{ id: project.id, groupId }], {
      onSuccess: () => toast.success(t(projectMessages.movedTo(name))),
    });
  };
</script>

{#snippet target(groupId: string | undefined, name: string, color?: string)}
  <DropdownMenuItem onSelect={() => moveTo(groupId, name)}>
    <!-- The folder of each group in its color, as on the page and in the sidebar. -->
    <ColorGlyph icon={FolderIcon} {color} />
    <span class="min-w-0 flex-1 truncate">{name}</span>
    {#if groupId === project.groupId}
      <CheckIcon class="size-4" aria-label={t(projectMessages.currentGroup)} />
    {/if}
  </DropdownMenuItem>
{/snippet}

{#snippet pins()}
  <DropdownMenuItem
    onSelect={() => {
      if (pinned) toast.info(t(projectMessages.alreadyPinned));
      else onPin?.();
    }}
  >
    <PinIcon class="size-4" aria-hidden="true" />
    <span class="min-w-0 flex-1 truncate">{t(projectMessages.pinned)}</span>
    {#if pinned}
      <CheckIcon class="size-4" aria-label={t(projectMessages.currentPin)} />
    {/if}
  </DropdownMenuItem>
{/snippet}

<DropdownMenuSub>
  <DropdownMenuSubTrigger>
    <FolderInputIcon class="size-4" aria-hidden="true" />
    {t(projectMessages.moveToGroup)}
  </DropdownMenuSubTrigger>
  <DropdownMenuSubContent class="w-[200px]">
    {#if onPin}
      {@render pins()}
      <DropdownMenuSeparator />
    {/if}
    {#each groups as group (group.id)}
      {@render target(group.id, group.name, group.color)}
    {/each}
    {@render target(undefined, t(projectMessages.ungrouped))}
    <DropdownMenuSeparator />
    <DropdownMenuItem onSelect={onNewGroup}>
      <FolderPlusIcon class="size-4" aria-hidden="true" />
      {t(projectMessages.newGroupMenu)}
    </DropdownMenuItem>
  </DropdownMenuSubContent>
</DropdownMenuSub>
