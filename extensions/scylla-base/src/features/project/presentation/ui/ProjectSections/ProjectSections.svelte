<script lang="ts">
  import { createMutation } from '@scylla/core-sdk';
  import { t } from '@scylla/ui/i18n';
  import { projectMessages } from '@base/features/project/presentation/messages/project.messages.ts';
  import {
    PINS,
    UNGROUPED,
  } from '@base/features/project/presentation/presenters/project-sections.presenter.ts';
  import { projectGroupMutations } from '../../project-group.queries.ts';
  import type { ProjectReorderState } from '../project-reorder.state.svelte.ts';
  import type { ProjectSectionsState, SectionView } from '../project-sections.state.svelte.ts';
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

  const create = (name: string) =>
    createGroup.mutate({ workspaceId, name }, { onSuccess: () => onCreated() });

  // A drop in any section ends the drag there: the section that took the last `dragover`.
  const drop = (event: DragEvent) => {
    if (!reorder.drag) return;
    event.preventDefault();
    reorder.drop();
  };
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

<div class="flex flex-col gap-4" role="presentation" ondrop={drop} data-part="project-sections">
  {#each groups as section (section.key)}
    {@render one(section)}
  {/each}
  {#if creating}
    <div class="flex flex-col gap-3">
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
</div>
