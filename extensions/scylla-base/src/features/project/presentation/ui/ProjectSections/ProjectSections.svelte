<script lang="ts">
  import FolderPlusIcon from '@lucide/svelte/icons/folder-plus';
  import { activeWorkspaceSlug, contextStore, workspaceUrl } from '@platform/context';
  import { createMutation } from '@scylla/core-sdk';
  import { DropSlot, fold, reflow, unfold } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { toRune } from '@scylla/ui/stores';
  import { cn } from '@scylla/ui/utils';
  import { projectMessages } from '@base/features/project/presentation/messages/project.messages.ts';
  import {
    groupNews,
    PINS,
    reorderNews,
    UNGROUPED,
    type SectionKey,
  } from '@base/features/project/presentation/presenters/project-sections.presenter.ts';
  import { liftedStyle } from '@base/features/project/presentation/presenters/sortable.presenter.ts';
  import { newProjectPath } from '@base/features/project/presentation/presenters/new-project.presenter.ts';
  import { projectGroupMutations } from '../../project-group.queries.ts';
  import type { GroupReorderState } from '../group-reorder.state.svelte.ts';
  import type { ProjectDensityState } from '../project-density.state.svelte.ts';
  import type { ProjectReorderState } from '../project-reorder.state.svelte.ts';
  import type { ProjectSectionsState, SectionView } from '../project-sections.state.svelte.ts';
  import { arrive, leave } from '../reorder.transition.ts';
  import { dragCards } from './card-drag.attachments.ts';
  import { dragGroups } from './group-drag.attachments.ts';
  import GroupNameRow from './GroupNameRow.svelte';
  import ProjectSection from './ProjectSection.svelte';

  interface Props {
    workspaceId: string;
    sections: ProjectSectionsState;
    reorder: ProjectReorderState;
    /** The order of the groups in the reorder mode. */
    groups: GroupReorderState;
    densities: ProjectDensityState;
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
    groups,
    densities,
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

  const GRIP_HINT = 'project-group-grip-hint';
  const SLOT_KEY = '\nslot';

  const pins = $derived(sections.sections.filter(section => section.key === PINS));
  const groupSections = $derived(sections.sections.filter(section => !!section.group));
  const ungrouped = $derived(sections.sections.filter(section => section.key === UNGROUPED));
  const lastKey = $derived(sections.sections.at(-1)?.key);
  // With no pin and no group, the page shows the cards with no header, as one list.
  const headless = $derived(pins.length === 0 && groupSections.length === 0 && !creating);

  // The pins stay first and « No group » last: only the groups move, with a slot for a pointer.
  type GroupEntry = { kind: 'section'; section: SectionView; lifted: boolean } | { kind: 'slot' };
  const pointerDrag = $derived(groups.drag && !groups.drag.keyboard ? groups.drag : null);
  const groupEntries = $derived.by((): GroupEntry[] => {
    const list: GroupEntry[] = groupSections.map(section => ({
      kind: 'section',
      section,
      lifted: pointerDrag?.id === section.key,
    }));
    const target = pointerDrag ? groups.target : null;
    if (!target) return list;
    const at = list.findIndex(
      entry => entry.kind === 'section' && entry.section.key === target.beforeId,
    );
    return at < 0
      ? [...list, { kind: 'slot' }]
      : [...list.slice(0, at), { kind: 'slot' }, ...list.slice(at)];
  });
  const keyOf = (entry: GroupEntry) => (entry.kind === 'slot' ? SLOT_KEY : entry.section.key);

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
  const groupText = $derived(
    groupNews({
      drag: groups.drag,
      order: groups.order ?? [],
      target: groups.target,
      stepped: groups.stepped,
      ended: groups.ended,
    }),
  );
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
    {groups}
    {densities}
    {phone}
    gripHintId={GRIP_HINT}
    last={section.key === lastKey}
    {headless}
    place={placeOf(section)}
    newProjectHref={newProjectHrefOf(section)}
    onNewGroup={section.key === UNGROUPED && !headless && newGroups ? onNewGroup : undefined}
  />
{/snippet}

<!-- The space between the sections is in their padding: a section that folds ends with no jump. -->
<div
  class={cn('relative flex flex-col', (reorder.drag || pointerDrag) && 'cursor-grabbing select-none')}
  data-part="project-sections"
  {@attach dragCards(reorder, projectName)}
  {@attach dragGroups(groups, sectionName)}
>
  {#each pins as section (section.key)}
    {@render one(section)}
  {/each}
  {#each groupEntries as entry (keyOf(entry))}
    {@const lifted = entry.kind === 'section' && entry.lifted}
    {@const keyboard = entry.kind === 'section' && groups.drag?.keyboard && groups.drag.id === entry.section.key}
    <!-- A dragged group leaves the flow: its header follows the pointer over the page. -->
    <div
      class={cn(
        entry.kind === 'slot' && 'pb-4',
        lifted && 'cursor-grabbing overflow-hidden rounded-lg bg-background shadow-2xl ring-2 ring-primary/60',
        keyboard && 'rounded-lg ring-2 ring-primary/60 ring-offset-4 ring-offset-background',
      )}
      style={lifted && pointerDrag ? liftedStyle(pointerDrag.box, groups.offset, groups.motion) : undefined}
      data-group-cell={entry.kind === 'section' ? entry.section.key : undefined}
      data-part={entry.kind === 'slot' ? 'group-drop-slot' : undefined}
      animate:reflow={{ still: lifted }}
      in:arrive={{ id: entry.kind === 'section' ? entry.section.key : undefined }}
      out:leave={{ id: entry.kind === 'section' ? entry.section.key : undefined, fade: !!groups.drag }}
    >
      {#if entry.kind === 'slot'}
        <DropSlot shape="header" style={`min-height: ${pointerDrag?.box.height ?? 40}px`} />
      {:else}
        {@render one(entry.section)}
      {/if}
    </div>
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
  <p class="sr-only" aria-live="polite">{groupText}</p>
  {#if reorder.active}
    <p id={GRIP_HINT} class="sr-only">{t(projectMessages.groupGripHint)}</p>
  {/if}
</div>
