<script lang="ts">
  import PinIcon from '@lucide/svelte/icons/pin';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import type { ProjectEntity } from '@base/features/project/domain/entities/project.entity.ts';
  import { projectMessages } from '@base/features/project/presentation/messages/project.messages.ts';
  import {
    dropBefore,
    PINS,
    UNGROUPED,
  } from '@base/features/project/presentation/presenters/project-sections.presenter.ts';
  import ProjectCard from '../ProjectCard/ProjectCard.svelte';
  import type { ProjectReorderState } from '../project-reorder.state.svelte.ts';
  import type { ProjectSectionsState, SectionView } from '../project-sections.state.svelte.ts';

  interface Props {
    section: SectionView;
    sections: ProjectSectionsState;
    reorder: ProjectReorderState;
    phone: boolean;
    grid: string;
  }

  let { section, sections, reorder, phone, grid }: Props = $props();

  const ZONE =
    'flex items-center justify-center gap-2 rounded-xl border border-dashed px-6 text-center text-muted-foreground';
  const SLOT_KEY = '\nslot';

  type Entry = { kind: 'card'; project: ProjectEntity; hidden: boolean } | { kind: 'slot' };

  const ids = $derived(section.projects.map(project => project.id));
  const drag = $derived(reorder.drag);
  const target = $derived(
    reorder.lifted && reorder.target?.to === section.key ? reorder.target : null,
  );
  // The dragged card stays in the page, hidden: the browser ends the drag on it.
  const entries = $derived.by((): Entry[] => {
    const cards: Entry[] = section.projects.map(project => ({
      kind: 'card',
      project,
      hidden: reorder.lifted && drag?.from === section.key && drag.id === project.id,
    }));
    if (!target) return cards;
    const at = cards.findIndex(
      entry => entry.kind === 'card' && entry.project.id === target.beforeId,
    );
    return at < 0
      ? [...cards, { kind: 'slot' }]
      : [...cards.slice(0, at), { kind: 'slot' }, ...cards.slice(at)];
  });
  const cells = $derived(entries.filter(entry => entry.kind === 'slot' || !entry.hidden).length);

  const pick = (event: DragEvent, project: ProjectEntity) => {
    const holder = event.currentTarget as HTMLElement;
    if (!reorder.active || !event.dataTransfer) return;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', project.name);
    // The dragged image: the card with a border in the main color, and a shadow.
    const card = holder.firstElementChild;
    card?.classList.add('border-primary', 'shadow-lg');
    setTimeout(() => card?.classList.remove('border-primary', 'shadow-lg'));
    const { id, name } = project;
    const next = ids[ids.indexOf(id) + 1];
    reorder.pick({ id, name, from: section.key, height: holder.offsetHeight }, next);
  };

  /** Over a card: the slot goes before it, or after it on its second half. */
  const overCard = (event: DragEvent, projectId: string) => {
    if (!drag || projectId === drag.id) return;
    const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const rest = ids.filter(id => id !== drag.id);
    const beforeId = dropBefore(rest, projectId, event.clientX > box.left + box.width / 2);
    if (!reorder.hover(section.key, beforeId)) return;
    event.preventDefault();
    event.stopPropagation();
  };

  /** Between the cards or on an empty zone: the slot stays, or goes last when it comes in. */
  const overSection = (event: DragEvent) => {
    if (!drag || !reorder.accepts(section.key)) return;
    event.preventDefault();
    if (reorder.target?.to !== section.key || reorder.target.header) reorder.hover(section.key);
  };
</script>

{#if entries.length === 0}
  {#if section.key === PINS}
    <div class={cn(ZONE, 'py-4 text-sm font-medium')} role="note" ondragover={overSection}>
      <PinIcon class="size-4 shrink-0" aria-hidden="true" />
      {t(reorder.active ? projectMessages.pinsDrop : projectMessages.pinsEmpty)}
    </div>
  {:else if section.key !== UNGROUPED}
    <div class={cn(ZONE, 'py-6 text-sm font-medium')} role="note" ondragover={overSection}>
      {t(projectMessages.emptyGroup)}
    </div>
  {:else if reorder.active}
    <div class={cn(ZONE, 'py-6 text-sm font-medium')} role="note" ondragover={overSection}>
      {t(projectMessages.dropHere)}
    </div>
  {/if}
{:else}
  <div class={grid} role="list" ondragover={overSection}>
    {#each entries as entry (entry.kind === 'slot' ? SLOT_KEY : entry.project.id)}
      {#if entry.kind === 'slot'}
        <div
          class="rounded-xl border-[1.5px] border-dashed border-primary bg-primary/8"
          style:min-height="{drag?.height ?? 0}px"
          role="listitem"
          data-part="project-drop-slot"
        ></div>
      {:else}
        <!-- In the reorder mode, the whole card is the handle: its parts take no click. -->
        <div
          class={cn(
            'h-full',
            entry.hidden && 'hidden',
            reorder.active && 'cursor-grab *:pointer-events-none active:cursor-grabbing',
          )}
          role="listitem"
          draggable={reorder.active}
          ondragstart={event => pick(event, entry.project)}
          ondragend={reorder.release}
          ondragover={event => overCard(event, entry.project.id)}
        >
          <ProjectCard
            project={entry.project}
            batch={sections.batchOf(section.key, entry.project.id)}
            section={section.key}
            reordering={reorder.active}
          />
        </div>
      {/if}
    {/each}
    {#if section.key === PINS && !phone}
      <!-- The free cell of the last row of the pins, when there is one. -->
      <div
        class={cn(
          ZONE,
          'hidden flex-col py-4 text-xs',
          cells % 2 !== 0 && 'md:flex',
          cells % 3 !== 0 ? 'xl:flex' : 'xl:hidden',
        )}
        role="note"
      >
        <PinIcon class="size-4 shrink-0" aria-hidden="true" />
        {t(reorder.active ? projectMessages.pinsDrop : projectMessages.pinsZone)}
      </div>
    {/if}
  </div>
{/if}
