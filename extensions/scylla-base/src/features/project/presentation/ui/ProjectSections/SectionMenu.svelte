<script lang="ts">
  import ArrowDownIcon from '@lucide/svelte/icons/arrow-down';
  import ArrowUpIcon from '@lucide/svelte/icons/arrow-up';
  import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
  import PencilIcon from '@lucide/svelte/icons/pencil';
  import PlusIcon from '@lucide/svelte/icons/plus';
  import Trash2Icon from '@lucide/svelte/icons/trash-2';
  import { navigateTo } from '@platform/context';
  import { createMutation } from '@scylla/core-sdk';
  import { ConfirmOperationAlertDialog } from '@scylla/ui';
  import {
    buttonVariants,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import type { ProjectGroupEntity } from '@base/features/project/domain/entities/project-group.entity.ts';
  import { projectMessages } from '@base/features/project/presentation/messages/project.messages.ts';
  import type { ProjectDensity } from '@base/features/project/presentation/presenters/project-density.presenter.ts';
  import { projectGroupMutations } from '../../project-group.queries.ts';
  import { DENSITY_ICONS } from '../ProjectDensity/density-icons.registry.ts';
  import DensityRadioItems from '../ProjectDensity/DensityRadioItems.svelte';

  interface Props {
    /** The accessible name of the button. */
    label: string;
    /** The group of a group section. Unset: the pins or « No group ». */
    group?: ProjectGroupEntity;
    /** The place of the group in the order of the groups, from 0: a person who manages them. */
    place?: { index: number; count: number };
    /** « New project here » opens it. Unset: the person cannot create a project here. */
    newProjectHref?: string;
    /** The density of the section. */
    density: ProjectDensity;
    /** A phone: the densities open under « Display », and each item is 44 px high. */
    phone: boolean;
    onDensity: (density: ProjectDensity) => void;
    onRename?: () => void;
    /** The reorder mode: « Move up » and « Move down » change the order of the page, not the server. */
    onMove?: (position: number) => void;
  }

  let {
    label,
    group,
    place,
    newProjectHref,
    density,
    phone,
    onDensity,
    onRename,
    onMove,
  }: Props = $props();

  const reorder = createMutation(() => projectGroupMutations.reorder());
  const remove = createMutation(() => projectGroupMutations.remove());

  let deleteOpen = $state(false);

  const DensityIcon = $derived(DENSITY_ICONS[density]);
  const ITEM = $derived(cn(phone && 'min-h-11'));

  const moveTo = (position: number) => {
    if (!group) return;
    if (onMove) onMove(position);
    else reorder.mutate({ groupId: group.id, position });
  };
  const confirmDelete = () => {
    if (group) remove.mutate(group.id, { onSettled: () => (deleteOpen = false) });
  };
</script>

<DropdownMenu>
  <DropdownMenuTrigger
    class={cn(
      buttonVariants({ variant: 'ghost', size: 'icon' }),
      'size-8 rounded-full max-md:size-11 pointer-coarse:size-11',
    )}
    data-part="section-menu"
  >
    <EllipsisIcon class="size-4" aria-hidden="true" />
    <span class="sr-only">{label}</span>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" class="w-60">
    {#if newProjectHref}
      {@const href = newProjectHref}
      <DropdownMenuItem class={ITEM} onSelect={() => navigateTo(href)}>
        <PlusIcon class="size-4" aria-hidden="true" />
        {t(projectMessages.newProjectHere)}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
    {/if}
    <!-- The density of this section: a choice of the person, as the density of the page. -->
    <DropdownMenuSub>
      <DropdownMenuSubTrigger class={ITEM} data-part="section-display">
        <DensityIcon class="size-4" aria-hidden="true" />
        {t(projectMessages.display)}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent
        class="w-52"
        side={phone ? 'bottom' : 'right'}
        align={phone ? 'end' : 'start'}
        aria-label={t(projectMessages.sectionDisplay)}
      >
        <DensityRadioItems value={density} {phone} onChange={onDensity} />
      </DropdownMenuSubContent>
    </DropdownMenuSub>
    {#if group && place}
      <DropdownMenuSeparator />
      {#if onRename}
        <DropdownMenuItem class={ITEM} onSelect={onRename}>
          <PencilIcon class="size-4" aria-hidden="true" />
          {t(projectMessages.rename)}
        </DropdownMenuItem>
      {/if}
      <DropdownMenuItem
        class={ITEM}
        disabled={place.index === 0}
        onSelect={() => moveTo(place.index - 1)}
      >
        <ArrowUpIcon class="size-4" aria-hidden="true" />
        {t(projectMessages.moveUp)}
      </DropdownMenuItem>
      <DropdownMenuItem
        class={ITEM}
        disabled={place.index >= place.count - 1}
        onSelect={() => moveTo(place.index + 1)}
      >
        <ArrowDownIcon class="size-4" aria-hidden="true" />
        {t(projectMessages.moveDown)}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive" class={ITEM} onSelect={() => (deleteOpen = true)}>
        <Trash2Icon class="size-4" aria-hidden="true" />
        {t(projectMessages.deleteGroup)}
      </DropdownMenuItem>
    {/if}
  </DropdownMenuContent>
</DropdownMenu>

{#if group}
  <ConfirmOperationAlertDialog
    open={deleteOpen}
    onOpenChange={open => (deleteOpen = open)}
    onContinue={confirmDelete}
    title={t(projectMessages.deleteGroupTitle(group.name))}
    description={t(projectMessages.deleteGroupBody)}
    continueLabel={t(projectMessages.deleteGroup)}
    isLoading={remove.isPending}
  />
{/if}
