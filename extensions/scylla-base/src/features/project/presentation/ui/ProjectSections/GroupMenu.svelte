<script lang="ts">
  import ArrowDownIcon from '@lucide/svelte/icons/arrow-down';
  import ArrowUpIcon from '@lucide/svelte/icons/arrow-up';
  import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
  import PencilIcon from '@lucide/svelte/icons/pencil';
  import Trash2Icon from '@lucide/svelte/icons/trash-2';
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
  import type { ProjectGroupEntity } from '@base/features/project/domain/entities/project-group.entity.ts';
  import { projectMessages } from '@base/features/project/presentation/messages/project.messages.ts';
  import { projectGroupMutations } from '../../project-group.queries.ts';

  interface Props {
    group: ProjectGroupEntity;
    /** The place of the group in the order of the groups, from 0. */
    index: number;
    count: number;
    onRename: () => void;
  }

  let { group, index, count, onRename }: Props = $props();

  const reorder = createMutation(() => projectGroupMutations.reorder());
  const remove = createMutation(() => projectGroupMutations.remove());

  let deleteOpen = $state(false);

  const moveTo = (position: number) => reorder.mutate({ groupId: group.id, position });
  const confirmDelete = () => remove.mutate(group.id, { onSettled: () => (deleteOpen = false) });
</script>

<DropdownMenu>
  <DropdownMenuTrigger
    class={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'size-8 rounded-full max-md:size-11')}
  >
    <EllipsisIcon class="size-4" aria-hidden="true" />
    <span class="sr-only">{t(projectMessages.groupMenu)}</span>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" class="w-60">
    <DropdownMenuItem onSelect={onRename}>
      <PencilIcon class="size-4" aria-hidden="true" />
      {t(projectMessages.rename)}
    </DropdownMenuItem>
    <DropdownMenuItem disabled={index === 0} onSelect={() => moveTo(index - 1)}>
      <ArrowUpIcon class="size-4" aria-hidden="true" />
      {t(projectMessages.moveUp)}
    </DropdownMenuItem>
    <DropdownMenuItem disabled={index >= count - 1} onSelect={() => moveTo(index + 1)}>
      <ArrowDownIcon class="size-4" aria-hidden="true" />
      {t(projectMessages.moveDown)}
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem variant="destructive" onSelect={() => (deleteOpen = true)}>
      <Trash2Icon class="size-4" aria-hidden="true" />
      {t(projectMessages.deleteGroup)}
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>

<ConfirmOperationAlertDialog
  open={deleteOpen}
  onOpenChange={open => (deleteOpen = open)}
  onContinue={confirmDelete}
  title={t(projectMessages.deleteGroupTitle(group.name))}
  description={t(projectMessages.deleteGroupBody)}
  continueLabel={t(projectMessages.deleteGroup)}
  isLoading={remove.isPending}
/>
