import { tick } from 'svelte';
import type { Attachment } from 'svelte/attachments';
import {
  boxOf,
  dragWithKeys,
  dragWithPointer,
  layoutBox,
  pulseDrop,
  type Point,
} from '@scylla/ui/dnd';
import { t } from '@scylla/ui/i18n';
import { toast } from '@scylla/ui/utils';
import { projectMessages } from '@base/features/project/presentation/messages/project.messages.ts';
import {
  cardTargetAt,
  PINS,
  type SectionKey,
  type SectionZone,
} from '@base/features/project/presentation/presenters/project-sections.presenter.ts';
import type { ProjectReorderState } from '../project-reorder.state.svelte.ts';

const CARD = '[data-card]';
const SECTION = '[data-section]';
const HEADER = '[data-part="project-section-header"]';
const GRID = '[data-part="project-grid"]';
const SLOT = '[data-part="project-drop-slot"]';
const CHIP_SLOT = '[data-part="folded-drop-slot"]';

/** Svelte takes a cell that goes out of the flow while it fades: it is not a place anymore. */
const inFlow = (cell: HTMLElement) => cell.style.position !== 'absolute';

const sectionOf = (root: HTMLElement, key: SectionKey) =>
  root.querySelector<HTMLElement>(`${SECTION}[data-section="${key}"]`);

/** The sections as the drag measures them: their whole box, and the cards where the grid puts them. */
const zonesOf = (root: HTMLElement, dragId: string): SectionZone[] =>
  [...root.querySelectorAll<HTMLElement>(SECTION)].map(section => {
    const grid = section.querySelector<HTMLElement>(GRID);
    const cells = grid
      ? [...grid.querySelectorAll<HTMLElement>(`:scope > ${CARD}`)]
          .filter(cell => inFlow(cell) && cell.dataset.card !== dragId)
          .map(cell => ({ id: cell.dataset.card ?? '', box: layoutBox(cell) }))
      : [];
    // The tracks of the grid, else the cards on the first row (a grid with no computed tracks).
    const tracks = grid
      ? getComputedStyle(grid)
          .gridTemplateColumns.split(' ')
          .filter(track => track && track !== 'none').length
      : 0;
    const first = cells[0]?.box.top;
    const columns =
      tracks || Math.max(1, cells.filter(cell => Math.abs(cell.box.top - first) < 1).length);
    return {
      key: section.dataset.section ?? '',
      box: boxOf(section.getBoundingClientRect()),
      open: section.dataset.open !== undefined,
      cells,
      columns,
    };
  });

const nextCardOf = (card: HTMLElement): string | undefined => {
  let next = card.nextElementSibling;
  while (next && !next.matches(CARD)) next = next.nextElementSibling;
  return (next as HTMLElement | null)?.dataset.card;
};

/** The slot of the drag, or the place in a section that shows no card: the card flies there. */
const landingOf = (root: HTMLElement, to: SectionKey | undefined) => {
  const slot = [...root.querySelectorAll<HTMLElement>(SLOT)].find(inFlow);
  if (slot) return layoutBox(slot);
  const section = to ? sectionOf(root, to) : null;
  const place = section?.querySelector(CHIP_SLOT) ?? section?.querySelector(HEADER) ?? section;
  return place ? boxOf(place.getBoundingClientRect()) : null;
};

/** The section that got a card pulses once: its header, or the card on a page with no header. */
const pulseSection = async (root: HTMLElement, to: SectionKey, id: string) => {
  await tick();
  const section = sectionOf(root, to);
  pulseDrop(section?.querySelector(HEADER) ?? section?.querySelector(`[data-card="${id}"]`));
};

/**
 * The pointer drag of the cards of the reorder mode, on the root of the sections. The card lifts
 * and follows the pointer (`dragWithPointer`, the ghost of the state). The section under the
 * pointer takes the card (`cardTargetAt`); a section of another density gives the card the shape
 * of its slot. A drop sends the card into its slot and the section pulses; Escape, a drop out of
 * each section or at its own place sends it back.
 */
export const dragCards =
  (reorder: ProjectReorderState, nameOf: (id: string) => string): Attachment<HTMLElement> =>
  root => {
    let pointer: Point = { x: 0, y: 0 };
    // The density of the section of the card: a slot in a section of another density reshapes it.
    let source: string | undefined;

    /** The card takes the shape of the slot, in a section of another density. */
    const reshape = () => {
      if (!reorder.ghost.lifted) return;
      const slot = [...root.querySelectorAll<HTMLElement>(SLOT)].find(inFlow);
      const density = slot?.closest<HTMLElement>(SECTION)?.dataset.density;
      if (!slot || !density) return;
      reorder.ghost.reshape(
        density === source ? null : { width: slot.offsetWidth, height: slot.offsetHeight },
      );
    };

    const retarget = () => {
      const drag = reorder.drag;
      if (!drag || drag.keyboard || reorder.settling) return;
      const aim = cardTargetAt(zonesOf(root, drag.id), pointer, reorder.accepts, reorder.target);
      reorder.aim(aim.over, aim.target);
      // The slot shows in its section after the update.
      void tick().then(reshape);
    };

    const finish = async (drop: boolean) => {
      const drag = reorder.drag;
      if (!drag) return;
      const refused = drop ? reorder.refused : null;
      const moved = drop && reorder.moved;
      if (!moved) reorder.cancel();
      reorder.settle();
      if (refused) {
        toast.info(
          t(
            refused === PINS
              ? projectMessages.alreadyPinnedDrop(drag.name)
              : projectMessages.alreadyInDrop(
                  drag.name,
                  sectionOf(root, refused)?.getAttribute('aria-label') ?? '',
                ),
          ),
        );
      }
      await tick();
      const to = reorder.target?.to;
      const box = landingOf(root, to);
      if (box) await reorder.ghost.settle(box);
      if (moved) reorder.drop();
      else reorder.release();
      reorder.ghost.end();
      if (moved && to) await pulseSection(root, to, drag.id);
    };

    return dragWithPointer<HTMLElement>(() => ({
      pick: target => {
        if (!reorder.active || reorder.drag) return null;
        const card = target.closest<HTMLElement>(CARD);
        return card && root.contains(card) && card.closest(SECTION) ? card : null;
      },
      start: (card, at, from) => {
        const id = card.dataset.card ?? '';
        const section = card.closest<HTMLElement>(SECTION);
        const box = boxOf(card.getBoundingClientRect());
        source = section?.dataset.density;
        pointer = at;
        reorder.pick(
          { id, name: nameOf(id), from: section?.dataset.section ?? '', box },
          nextCardOf(card),
        );
        reorder.ghost.lift(box, { x: from.x - box.left, y: from.y - box.top }, at);
      },
      move: at => {
        pointer = at;
        reorder.ghost.follow(at);
        retarget();
      },
      end: drop => void finish(drop),
    }))(root);
  };

/**
 * The keyboard drag of one card, on its cell: Space lifts it, the arrow keys move its slot (also
 * into the next section), Space drops it and Escape cancels. The card stays in its place until the
 * drop; then it goes to its slot and keeps the focus.
 */
export const dragCardWithKeys =
  (
    reorder: ProjectReorderState,
    card: () => { id: string; name: string; section: SectionKey; nextId?: string },
  ): Attachment<HTMLElement> =>
  element => {
    const keepFocus = async (id: string, to: SectionKey | null) => {
      await tick();
      const root = element.closest('[data-part="project-sections"]') ?? document;
      const moved = to
        ? root.querySelector<HTMLElement>(`${SECTION}[data-section="${to}"] [data-card="${id}"]`)
        : null;
      (moved ?? root.querySelector<HTMLElement>(`[data-card="${id}"]`))?.focus();
    };
    return dragWithKeys(() => ({
      lifted: () => !!reorder.drag?.keyboard && reorder.drag.id === card().id,
      pick: () => {
        const { id, name, section, nextId } = card();
        reorder.pick(
          { id, name, from: section, box: boxOf(element.getBoundingClientRect()) },
          nextId,
          true,
        );
      },
      step: delta => {
        reorder.step(delta);
        void tick().then(() =>
          document
            .querySelector<HTMLElement>(`${SLOT}, ${CHIP_SLOT}`)
            ?.scrollIntoView({ block: 'nearest' }),
        );
      },
      drop: () => {
        const { id } = card();
        const to = reorder.moved ? (reorder.target?.to ?? null) : null;
        reorder.drop();
        if (!to) return;
        void keepFocus(id, to);
        const sections = element.closest<HTMLElement>('[data-part="project-sections"]');
        if (sections) void pulseSection(sections, to, id);
      },
      cancel: () => {
        reorder.cancel();
        reorder.release();
      },
    }))(element);
  };
