<script lang="ts">
  import PinIcon from '@lucide/svelte/icons/pin';
  import PlusIcon from '@lucide/svelte/icons/plus';
  import { DropSlot, enter, exit, GhostItem, reflow, unfold } from '@scylla/ui';
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import type { ProjectEntity } from '@base/features/project/domain/entities/project.entity.ts';
  import { projectMessages } from '@base/features/project/presentation/messages/project.messages.ts';
  import {
    DENSITY_GHOSTS,
    DENSITY_GRIDS,
    DENSITY_SLOTS,
    type ProjectDensity,
  } from '@base/features/project/presentation/presenters/project-density.presenter.ts';
  import {
    PINS,
    UNGROUPED,
  } from '@base/features/project/presentation/presenters/project-sections.presenter.ts';
  import { liftedStyle } from '@base/features/project/presentation/presenters/sortable.presenter.ts';
  import ProjectItem from '../ProjectCard/ProjectItem.svelte';
  import type { ProjectDensityState } from '../project-density.state.svelte.ts';
  import type { ProjectReorderState } from '../project-reorder.state.svelte.ts';
  import type { ProjectSectionsState, SectionView } from '../project-sections.state.svelte.ts';
  import { arrive, foldZone, leave } from '../reorder.transition.ts';
  import { flipDensity } from './density-flip.effect.svelte.ts';
  import { revealCard, staggerCards } from './section-open.attachments.ts';

  interface Props {
    section: SectionView;
    sections: ProjectSectionsState;
    reorder: ProjectReorderState;
    /** The density of each section: a dragged card takes the shape of the section under it. */
    densities: ProjectDensityState;
    phone: boolean;
    /** The ghost card and the empty group open it. Unset: no new project here. */
    newProjectHref?: string;
    /** The person opened the section now: the cards fade in one after the other. */
    stagger?: boolean;
    /** The card that a chip of the folded section opened: the page scrolls to it. */
    reveal?: string | null;
    onRevealed?: () => void;
  }

  let {
    section,
    sections,
    reorder,
    densities,
    phone,
    newProjectHref,
    stagger = false,
    reveal = null,
    onRevealed = () => {},
  }: Props = $props();

  const ZONE =
    'flex items-center justify-center gap-2 rounded-xl border border-dashed px-6 text-center text-muted-foreground';
  const SLOT_KEY = '\nslot';

  type Entry = { kind: 'card'; project: ProjectEntity; lifted: boolean } | { kind: 'slot' };

  const density = $derived(densities.of(section.key));
  const drag = $derived(reorder.drag);
  const target = $derived(reorder.target?.to === section.key ? reorder.target : null);
  // The dragged card takes the shape of the section under it.
  const liftedDensity = $derived<ProjectDensity>(
    reorder.target && !reorder.target.header ? densities.of(reorder.target.to) : density,
  );
  // A slot of the density of the dragged card has its size; else the size of the cards here.
  const slotStyle = $derived(
    drag && densities.of(drag.from) === density ? `min-height: ${drag.box.height}px` : undefined,
  );
  // The dragged card stays in its grid, out of the flow: it follows the pointer over the page.
  const entries = $derived.by((): Entry[] => {
    const cards: Entry[] = section.projects.map(project => ({
      kind: 'card',
      project,
      lifted: drag?.from === section.key && drag.id === project.id,
    }));
    if (!target) return cards;
    const at = cards.findIndex(
      entry => entry.kind === 'card' && entry.project.id === target.beforeId,
    );
    return at < 0
      ? [...cards, { kind: 'slot' }]
      : [...cards.slice(0, at), { kind: 'slot' }, ...cards.slice(at)];
  });
  const cells = $derived(entries.filter(entry => entry.kind === 'slot' || !entry.lifted).length);
  // The ghost card is not a card: no drag. The reorder mode keeps it in its place, turned off.
  const ghost = $derived(!!newProjectHref && section.key !== PINS);
  const OFF = 'opacity-40';
  const keyOf = (entry: Entry) => (entry.kind === 'slot' ? SLOT_KEY : entry.project.id);
  const flip = flipDensity(() => density);
</script>

{#snippet zone(text: string, padding: string, pin = false)}
  <div
    class={cn(ZONE, padding, 'text-sm font-medium')}
    role="note"
    in:unfold
    out:foldZone={{ now: !!reorder.drag }}
  >
    {#if pin}<PinIcon class="size-4 shrink-0" aria-hidden="true" />{/if}
    {text}
  </div>
{/snippet}

{#if entries.length === 0}
  {#if section.key === PINS}
    {@render zone(t(reorder.active ? projectMessages.pinsDrop : projectMessages.pinsEmpty), 'py-4', true)}
  {:else if section.key !== UNGROUPED && ghost && newProjectHref}
    <div
      class={cn(ZONE, 'flex-col py-5 text-sm')}
      data-part="project-empty-group"
      in:unfold
      out:foldZone={{ now: !!reorder.drag }}
    >
      <p class="font-medium">{t(projectMessages.emptyGroupCreate)}</p>
      <Button
        href={newProjectHref}
        variant="outline"
        size="sm"
        class={cn('transition-opacity motion-reduce:transition-none', reorder.active && OFF)}
        inert={reorder.active}
        aria-hidden={reorder.active || undefined}
      >
        <PlusIcon aria-hidden="true" />
        {t(projectMessages.newProject)}
      </Button>
    </div>
  {:else if section.key !== UNGROUPED}
    {@render zone(t(projectMessages.emptyGroup), 'py-6')}
  {:else if reorder.active}
    {@render zone(t(projectMessages.dropHere), 'py-6')}
  {/if}
{/if}
<!-- The grid stays with no card: a card that leaves it or comes in it moves with a transition. -->
<div
  class={cn(DENSITY_GRIDS[density], 'relative', entries.length === 0 && 'hidden')}
  role="list"
  data-part="project-grid"
  data-density={density}
  {@attach flip}
  {@attach stagger && staggerCards}
>
  {#each entries as entry (keyOf(entry))}
    <!-- In the reorder mode, the whole card is the handle: its parts take no click. -->
    <div
      class={cn(
        'h-full',
        entry.kind === 'card' &&
          reorder.active &&
          'cursor-grab touch-manipulation select-none [-webkit-touch-callout:none] *:pointer-events-none',
        entry.kind === 'card' &&
          entry.lifted &&
          'cursor-grabbing overflow-hidden rounded-xl shadow-2xl ring-2 ring-primary/60',
      )}
      style={entry.kind === 'card' && entry.lifted && drag
        ? liftedStyle(reorder.box, reorder.offset, reorder.motion)
        : undefined}
      role="listitem"
      data-card={entry.kind === 'card' ? entry.project.id : undefined}
      data-part={entry.kind === 'slot' ? 'project-drop-slot' : undefined}
      animate:reflow={{ still: entry.kind === 'card' && entry.lifted }}
      in:arrive={{ id: entry.kind === 'card' ? entry.project.id : undefined }}
      out:leave={{
        id: entry.kind === 'card' ? entry.project.id : undefined,
        fade: !!reorder.drag,
      }}
      {@attach entry.kind === 'card' && entry.project.id === reveal && revealCard(onRevealed)}
    >
      {#if entry.kind === 'card'}
        <ProjectItem
          project={entry.project}
          batch={sections.batchOf(section.key, entry.project.id)}
          section={section.key}
          reordering={reorder.active}
          density={entry.lifted ? liftedDensity : density}
          {phone}
        />
      {:else}
        <DropSlot
          shape={DENSITY_SLOTS[density]}
          class={cn(density === 'comfortable' && 'min-h-52')}
          style={slotStyle}
        />
      {/if}
    </div>
  {/each}
  {#if ghost && newProjectHref && entries.length > 0}
    <!-- After the last card: a new project in this section, with no drag. -->
    <div
      class={cn('h-full transition-opacity motion-reduce:transition-none', reorder.active && OFF)}
      role="listitem"
      inert={reorder.active}
      aria-hidden={reorder.active || undefined}
      in:enter
      out:exit
    >
      <GhostItem
        label={t(projectMessages.newProject)}
        href={newProjectHref}
        shape={DENSITY_GHOSTS[density]}
        class={cn(density === 'compact' && 'min-h-24')}
        data-part="project-ghost-card"
      />
    </div>
  {/if}
  {#if section.key === PINS && !phone && entries.length > 0 && density === 'comfortable'}
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
