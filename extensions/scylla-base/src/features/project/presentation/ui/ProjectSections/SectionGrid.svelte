<script lang="ts">
  import PinIcon from '@lucide/svelte/icons/pin';
  import { reflow, unfold } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import type { ProjectEntity } from '@base/features/project/domain/entities/project.entity.ts';
  import { projectMessages } from '@base/features/project/presentation/messages/project.messages.ts';
  import {
    PINS,
    UNGROUPED,
  } from '@base/features/project/presentation/presenters/project-sections.presenter.ts';
  import { liftedStyle } from '@base/features/project/presentation/presenters/sortable.presenter.ts';
  import ProjectCard from '../ProjectCard/ProjectCard.svelte';
  import type { ProjectReorderState } from '../project-reorder.state.svelte.ts';
  import type { ProjectSectionsState, SectionView } from '../project-sections.state.svelte.ts';
  import { arrive, foldZone, leave } from '../reorder.transition.ts';

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

  type Entry = { kind: 'card'; project: ProjectEntity; lifted: boolean } | { kind: 'slot' };

  const drag = $derived(reorder.drag);
  const target = $derived(reorder.target?.to === section.key ? reorder.target : null);
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
  const keyOf = (entry: Entry) => (entry.kind === 'slot' ? SLOT_KEY : entry.project.id);
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
  {:else if section.key !== UNGROUPED}
    {@render zone(t(projectMessages.emptyGroup), 'py-6')}
  {:else if reorder.active}
    {@render zone(t(projectMessages.dropHere), 'py-6')}
  {/if}
{/if}
<!-- The grid stays with no card: a card that leaves it or comes in it moves with a transition. -->
<div
  class={cn(grid, 'relative', entries.length === 0 && 'hidden')}
  role="list"
  data-part="project-grid"
>
  {#each entries as entry (keyOf(entry))}
    <!-- In the reorder mode, the whole card is the handle: its parts take no click. -->
    <div
      class={cn(
        'h-full',
        entry.kind === 'slot' &&
          'rounded-xl border-[1.5px] border-dashed border-primary bg-primary/8',
        entry.kind === 'card' &&
          reorder.active &&
          'cursor-grab touch-manipulation select-none [-webkit-touch-callout:none] *:pointer-events-none',
        entry.kind === 'card' &&
          entry.lifted &&
          'cursor-grabbing rounded-xl shadow-2xl ring-2 ring-primary/60',
      )}
      style={entry.kind === 'card' && entry.lifted && drag
        ? liftedStyle(drag.box, reorder.offset, reorder.motion)
        : entry.kind === 'slot'
          ? `min-height: ${drag?.box.height ?? 0}px`
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
    >
      {#if entry.kind === 'card'}
        <ProjectCard
          project={entry.project}
          batch={sections.batchOf(section.key, entry.project.id)}
          section={section.key}
          reordering={reorder.active}
        />
      {/if}
    </div>
  {/each}
  {#if section.key === PINS && !phone && entries.length > 0}
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
