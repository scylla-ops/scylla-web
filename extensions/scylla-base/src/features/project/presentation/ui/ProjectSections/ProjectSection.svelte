<script lang="ts">
  import { createMutation } from '@scylla/core-sdk';
  import { fold, ListSkeleton, unfold } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import { projectMessages } from '@base/features/project/presentation/messages/project.messages.ts';
  import { PINS } from '@base/features/project/presentation/presenters/project-sections.presenter.ts';
  import { projectGroupMutations } from '../../project-group.queries.ts';
  import ProjectShowMore from '../ProjectResults/ProjectShowMore.svelte';
  import type { ProjectReorderState } from '../project-reorder.state.svelte.ts';
  import type { ProjectSectionsState, SectionView } from '../project-sections.state.svelte.ts';
  import GroupMenu from './GroupMenu.svelte';
  import GroupNameRow from './GroupNameRow.svelte';
  import SectionGrid from './SectionGrid.svelte';
  import SectionHeader from './SectionHeader.svelte';

  interface Props {
    section: SectionView;
    name: string;
    sections: ProjectSectionsState;
    reorder: ProjectReorderState;
    phone: boolean;
    /** The only section of the page: its cards show with no header. */
    headless: boolean;
    /** The place of a group in the order of the groups, for its menu. Unset: no menu. */
    place?: { index: number; count: number };
  }

  let { section, name, sections, reorder, phone, headless, place }: Props = $props();

  // A card needs about 300 px: breakpoints are viewport-wide and the sidebar takes ~16rem.
  const GRID = 'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3';
  const OPEN_AFTER_MS = 600;

  const renameGroup = createMutation(() => projectGroupMutations.rename());
  let renaming = $state(false);

  const drag = $derived(reorder.drag);
  const dropText = $derived(
    drag && reorder.target?.header && reorder.target.to === section.key
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

  const rename = (next: string) => {
    if (!section.group) return;
    const groupId = section.group.id;
    renameGroup.mutate({ groupId, name: next }, { onSuccess: () => (renaming = false) });
  };
</script>

{#snippet menu()}
  {#if section.group && place}
    <GroupMenu
      group={section.group}
      index={place.index}
      count={place.count}
      onRename={() => (renaming = true)}
    />
  {/if}
{/snippet}

<section
  class="flex flex-col not-last-of-type:pb-4"
  data-section={section.key}
  aria-label={name}
  in:unfold
  out:fold
>
  {#if !headless}
    <!-- The header unfolds when the reorder mode shows the pins over the cards with no group. -->
    <div class={cn(section.open && 'pb-3')} in:unfold out:fold>
      {#if renaming && section.group}
        <GroupNameRow
          initial={section.group.name}
          busy={renameGroup.isPending}
          onSubmit={rename}
          onCancel={() => (renaming = false)}
        />
      {:else}
        <SectionHeader
          {name}
          count={section.total}
          pins={section.key === PINS}
          open={section.open}
          counts={section.counts}
          {dropText}
          menu={place ? menu : undefined}
          onToggle={() => sections.toggle(section.key)}
        />
      {/if}
    </div>
  {/if}

  {#if section.open || headless}
    <div class="flex flex-col gap-3">
      {#if section.loading}
        <ListSkeleton rows={phone ? 1 : 3} class={GRID} rowClass="h-60 w-full rounded-xl" />
      {:else}
        <SectionGrid {section} {sections} {reorder} {phone} grid={GRID} />
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
  {/if}
</section>
