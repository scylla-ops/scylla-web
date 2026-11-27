<script lang="ts">
  import FolderPlusIcon from '@lucide/svelte/icons/folder-plus';
  import PlusIcon from '@lucide/svelte/icons/plus';
  import { createMutation } from '@scylla/core-sdk';
  import {
    enter,
    exit,
    fold,
    ListSkeleton,
    MORPH_BOX_CLASS,
    morphHeight,
    swapIn,
    swapOut,
    unfold,
  } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import { projectMessages } from '@base/features/project/presentation/messages/project.messages.ts';
  import {
    PINS,
    UNGROUPED,
  } from '@base/features/project/presentation/presenters/project-sections.presenter.ts';
  import {
    DENSITY_GRIDS,
    DENSITY_SKELETONS,
  } from '@base/features/project/presentation/presenters/project-density.presenter.ts';
  import { colorChange } from '@base/features/project/presentation/presenters/group-color.presenter.ts';
  import { projectGroupMutations } from '../../project-group.queries.ts';
  import ProjectShowMore from '../ProjectResults/ProjectShowMore.svelte';
  import type { GroupReorderState } from '../group-reorder.state.svelte.ts';
  import type { ProjectDensityState } from '../project-density.state.svelte.ts';
  import type { ProjectReorderState } from '../project-reorder.state.svelte.ts';
  import type { ProjectSectionsState, SectionView } from '../project-sections.state.svelte.ts';
  import GroupFolderColor from '../GroupColor/GroupFolderColor.svelte';
  import FoldedPreview from './FoldedPreview.svelte';
  import GroupGrip from './GroupGrip.svelte';
  import GroupNameRow from './GroupNameRow.svelte';
  import SectionMenu from './SectionMenu.svelte';
  import SectionAction from './SectionAction.svelte';
  import SectionGrid from './SectionGrid.svelte';
  import SectionHeader from './SectionHeader.svelte';

  interface Props {
    section: SectionView;
    name: string;
    sections: ProjectSectionsState;
    reorder: ProjectReorderState;
    /** The order of the groups in the reorder mode: a group has a handle in the place of its "+". */
    groups: GroupReorderState;
    densities: ProjectDensityState;
    phone: boolean;
    /** The id of the text that tells the keys of the handle of a group. */
    gripHintId: string;
    /** The only section of the page: its cards show with no header. */
    headless: boolean;
    /** The last section of the page: no space under it. */
    last: boolean;
    /** The place of a group in the order of the groups, for its menu. Unset: no group action. */
    place?: { index: number; count: number };
    /** A new project in this section: its "+", its menu, its ghost card. Unset: none. */
    newProjectHref?: string;
    /** « New group » in the header of « No group ». Unset: none. */
    onNewGroup?: () => void;
  }

  let {
    section,
    name,
    sections,
    reorder,
    groups,
    densities,
    phone,
    gripHintId,
    headless,
    last,
    place,
    newProjectHref,
    onNewGroup,
  }: Props = $props();

  const OPEN_AFTER_MS = 600;

  const updateGroup = createMutation(() => projectGroupMutations.update());
  let renaming = $state(false);
  let colorOpen = $state(false);
  // The person folded or opened the section: its cards or its chips come in with a motion. The
  // first paint of the page has none.
  let moved = $state(false);
  // The card that a chip opened: the page scrolls to it once it shows.
  let reveal = $state<string | null>(null);
  const density = $derived(densities.of(section.key));
  // The reorder mode keeps the line of chips: nothing in the page moves when the mode starts.
  const folded = $derived(!headless && !section.open && section.projects.length > 0);
  // One place in the header for the "+" and for the handle of a group (`place`: the person moves
  // the groups): the handle takes the place of the "+" in the reorder mode, so that nothing moves.
  const actionPlace = $derived(section.key !== PINS && (!!newProjectHref || !!place));

  const toggle = () => {
    moved = true;
    reveal = null;
    sections.toggle(section.key);
  };
  const openAt = (projectId?: string) => {
    moved = true;
    reveal = projectId ?? null;
    sections.open(section.key);
  };

  const drag = $derived(reorder.drag);
  const dropText = $derived(
    drag && reorder.refused === section.key
      ? t(projectMessages.alreadyPinnedDrop(drag.name))
      : drag && reorder.target?.header && reorder.target.to === section.key
      ? t(
          section.key === PINS
            ? projectMessages.releaseToPin(drag.name)
            : projectMessages.releaseInto(drag.name, name),
        )
      : undefined,
  );

  // A closed section opens when the dragged card stays on its header: the card can then go to a
  // place in it. A drop on the header puts the card last.
  const onClosedHeader = $derived(
    !!drag && !section.open && !!reorder.target?.header && reorder.target.to === section.key,
  );
  $effect(() => {
    if (!onClosedHeader) return;
    const timer = setTimeout(() => sections.open(section.key), OPEN_AFTER_MS);
    return () => clearTimeout(timer);
  });

  // In the reorder mode, « Move up » and « Move down » change the order of the page until « Done ».
  const moveGroup = (position: number) => {
    if (section.group) groups.moveTo(section.group.id, position);
  };

  // The menu closes first and gives the focus back: the colors open after it.
  const openColors = () => setTimeout(() => (colorOpen = true), 0);

  const rename = (next: string, color: string | undefined) => {
    if (!section.group) return;
    const { id: groupId, name: current, color: currentColor } = section.group;
    updateGroup.mutate(
      {
        groupId,
        name: next.trim() === current ? undefined : next,
        color: colorChange(color, currentColor),
      },
      { onSuccess: () => (renaming = false) },
    );
  };
</script>

{#snippet menu()}
  <SectionMenu
    label={t(section.group ? projectMessages.groupMenu : projectMessages.sectionMenu)}
    group={section.group}
    {place}
    newProjectHref={reorder.active ? undefined : newProjectHref}
    {density}
    {phone}
    onDensity={next => densities.setSection(section.key, next)}
    onRename={place ? () => (renaming = true) : undefined}
    onColor={place ? openColors : undefined}
    onMove={reorder.active ? moveGroup : undefined}
  />
{/snippet}

{#snippet actions()}
  {#if actionPlace}
    <div
      class="grid size-8 shrink-0 place-items-center *:col-start-1 *:row-start-1 max-md:size-11 pointer-coarse:size-11"
    >
      {#if reorder.active && section.group && place}
        <div class="flex" in:swapIn out:swapOut>
          <GroupGrip id={section.group.id} {name} {groups} hintId={gripHintId} />
        </div>
      {:else if !reorder.active && newProjectHref}
        <div class="flex" in:swapIn out:swapOut>
          <SectionAction
            icon={PlusIcon}
            label={t(
              section.key === UNGROUPED
                ? projectMessages.newProjectNoGroup
                : projectMessages.newProjectIn(name),
            )}
            href={newProjectHref}
            part="section-new-project"
          />
        </div>
      {/if}
    </div>
  {/if}
  {#if onNewGroup}
    <SectionAction
      icon={FolderPlusIcon}
      label={t(projectMessages.newGroup)}
      onclick={onNewGroup}
      part="section-new-group"
    />
  {/if}
{/snippet}

{#snippet folder()}
  {#if section.group}
    <GroupFolderColor group={section.group} bind:open={colorOpen} class="max-md:size-8" />
  {/if}
{/snippet}

<!-- The space between the sections is in their padding: a section that folds ends with no jump. -->
<section
  class={cn('flex flex-col', !last && 'pb-4')}
  data-section={section.key}
  data-density={density}
  aria-label={name}
  in:unfold
  out:fold
>
  {#if !headless}
    <!-- The header unfolds when the reorder mode shows the pins over the cards with no group. -->
    <div in:unfold out:fold>
      {#if renaming && section.group}
        <GroupNameRow
          initial={section.group.name}
          initialColor={section.group.color}
          busy={updateGroup.isPending}
          onSubmit={rename}
          onCancel={() => (renaming = false)}
        />
      {:else}
        <SectionHeader
          {name}
          count={section.total}
          pins={section.key === PINS}
          color={section.group?.color}
          folder={place && section.group ? folder : undefined}
          open={section.open}
          counts={section.counts}
          {dropText}
          {actions}
          {menu}
          onToggle={toggle}
        />
      {/if}
    </div>
  {/if}

  <!-- The cards and the line of chips take the place of each other in one box, which moves its
       height once. The space under the header is in the padding of each part: no jump. -->
  <div class={MORPH_BOX_CLASS} data-part="project-section-body" {@attach morphHeight}>
    {#if section.open || headless}
      <div class={cn('flex flex-col gap-3', !headless && 'pt-3')} in:enter out:exit>
        {#if section.loading}
          <ListSkeleton
            rows={phone ? 1 : 3}
            class={DENSITY_GRIDS[density]}
            rowClass={DENSITY_SKELETONS[density]}
          />
        {:else}
          <SectionGrid
            {section}
            {sections}
            {reorder}
            {densities}
            {phone}
            {newProjectHref}
            stagger={moved}
            {reveal}
            onRevealed={() => (reveal = null)}
          />
          {#if section.nextBatch > 0}
            <ProjectShowMore
              next={section.nextBatch}
              shown={section.projects.length}
              total={section.total}
              busy={section.busy}
              {phone}
              onShowMore={() => sections.showMore(section.key)}
            />
          {/if}
        {/if}
      </div>
    {:else if folded}
      <div class="pt-2" in:enter out:exit>
        <FoldedPreview
          projects={section.projects}
          total={section.total}
          {name}
          animate={moved}
          onOpen={openAt}
        />
      </div>
    {/if}
  </div>
</section>
