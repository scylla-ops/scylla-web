<script lang="ts">
  import { createMutation } from '@scylla/core-sdk';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import { projectMessages } from '@base/features/project/presentation/messages/project.messages.ts';
  import {
    PINS,
    reorderNews,
    UNGROUPED,
    type SectionKey,
  } from '@base/features/project/presentation/presenters/project-sections.presenter.ts';
  import { projectGroupMutations } from '../../project-group.queries.ts';
  import type { ProjectReorderState } from '../project-reorder.state.svelte.ts';
  import type { ProjectSectionsState, SectionView } from '../project-sections.state.svelte.ts';
  import { dragCards } from './card-drag.attachments.ts';
  import GroupNameRow from './GroupNameRow.svelte';
  import ProjectSection from './ProjectSection.svelte';

  interface Props {
    workspaceId: string;
    sections: ProjectSectionsState;
    reorder: ProjectReorderState;
    phone: boolean;
    /** The person changes the groups: each group has its menu. */
    canManage: boolean;
    /** « New group » shows its row, after the other groups. */
    creating: boolean;
    onCreated: () => void;
  }

  let { workspaceId, sections, reorder, phone, canManage, creating, onCreated }: Props = $props();

  const createGroup = createMutation(() => projectGroupMutations.create());

  const groups = $derived(sections.sections.filter(section => section.key !== UNGROUPED));
  const ungrouped = $derived(sections.sections.filter(section => section.key === UNGROUPED));
  // With no pin and no group, the page shows the cards with no header, as one list.
  const headless = $derived(groups.length === 0 && !creating);

  const nameOf = (section: SectionView) =>
    section.key === PINS
      ? t(projectMessages.pinned)
      : section.key === UNGROUPED
        ? t(projectMessages.ungrouped)
        : (section.group?.name ?? '');
  const placeOf = (section: SectionView) => {
    const index = sections.groups.findIndex(group => group.id === section.key);
    return canManage && index >= 0 ? { index, count: sections.groups.length } : undefined;
  };

  const sectionName = (key: SectionKey) => {
    const section = sections.sections.find(item => item.key === key);
    return section ? nameOf(section) : '';
  };
  const projectName = (id: string) =>
    sections.sections.flatMap(section => section.projects).find(project => project.id === id)
      ?.name ?? '';
  const news = $derived(
    reorderNews({
      drag: reorder.drag,
      target: reorder.target,
      ended: reorder.ended,
      idsOf: sections.idsOf,
      nameOf: sectionName,
    }),
  );

  const create = (name: string) =>
    createGroup.mutate({ workspaceId, name }, { onSuccess: () => onCreated() });
</script>

{#snippet one(section: SectionView)}
  <ProjectSection
    {section}
    name={nameOf(section)}
    {sections}
    {reorder}
    {phone}
    {headless}
    place={placeOf(section)}
  />
{/snippet}

<!-- The space between the sections is in their padding: a section that folds ends with no jump. -->
<div
  class={cn('flex flex-col', reorder.drag && 'cursor-grabbing select-none')}
  data-part="project-sections"
  {@attach dragCards(reorder, projectName)}
>
  {#each groups as section (section.key)}
    {@render one(section)}
  {/each}
  {#if creating}
    <div class="flex flex-col gap-3 pb-4">
      <GroupNameRow busy={createGroup.isPending} onSubmit={create} onCancel={onCreated} />
      <div
        class="flex items-center justify-center rounded-xl border border-dashed px-6 py-6 text-center text-sm font-medium text-muted-foreground"
        role="note"
      >
        {t(projectMessages.emptyGroup)}
      </div>
    </div>
  {/if}
  {#each ungrouped as section (section.key)}
    {@render one(section)}
  {/each}
  <p class="sr-only" aria-live="polite">{news}</p>
</div>
