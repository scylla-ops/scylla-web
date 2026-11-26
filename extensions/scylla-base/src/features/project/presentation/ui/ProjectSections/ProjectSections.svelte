<script lang="ts">
  import FolderPlusIcon from '@lucide/svelte/icons/folder-plus';
  import { activeWorkspaceSlug, contextStore, workspaceUrl } from '@platform/context';
  import { createMutation } from '@scylla/core-sdk';
  import { fold, unfold } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { toRune } from '@scylla/ui/stores';
  import { cn } from '@scylla/ui/utils';
  import { projectMessages } from '@base/features/project/presentation/messages/project.messages.ts';
  import {
    PINS,
    reorderNews,
    UNGROUPED,
    type SectionKey,
  } from '@base/features/project/presentation/presenters/project-sections.presenter.ts';
  import { newProjectPath } from '@base/features/project/presentation/presenters/new-project.presenter.ts';
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
    /** The person creates projects in the workspace: each section offers a new project. */
    canCreate: boolean;
    /** « New group » shows its row, after the other groups. */
    creating: boolean;
    onNewGroup: () => void;
    onCreated: () => void;
  }

  let {
    workspaceId,
    sections,
    reorder,
    phone,
    canManage,
    canCreate,
    creating,
    onNewGroup,
    onCreated,
  }: Props = $props();

  const context = toRune(contextStore);
  const slug = $derived(context().workspace.slug ?? activeWorkspaceSlug() ?? '');
  /** The new project page, with the group of the section. The pins are no group: no link. */
  const newProjectHrefOf = (section: SectionView) =>
    canCreate && slug && section.key !== PINS
      ? workspaceUrl(slug, newProjectPath(section.group?.id))
      : undefined;
  // A phone has no « New group », as in the header of the page.
  const newGroups = $derived(canManage && !phone && !creating);

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

  const create = (name: string, color: string | undefined) =>
    createGroup.mutate({ workspaceId, name, color }, { onSuccess: () => onCreated() });
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
    newProjectHref={newProjectHrefOf(section)}
    onNewGroup={section.key === UNGROUPED && !headless && newGroups ? onNewGroup : undefined}
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
  {#if !headless && newGroups}
    <!-- After the last group: one more group. The header has the same action. -->
    <div class="pb-4" in:unfold out:fold>
      <button
        type="button"
        class="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed text-sm font-medium text-muted-foreground transition-colors outline-none hover:border-primary/50 hover:bg-primary/5 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 motion-reduce:transition-none"
        data-part="project-new-group-end"
        onclick={onNewGroup}
      >
        <FolderPlusIcon class="size-4" aria-hidden="true" />
        {t(projectMessages.newGroup)}
      </button>
    </div>
  {/if}
  {#if creating}
    <div class="flex flex-col gap-3 pb-4" in:unfold out:fold>
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
