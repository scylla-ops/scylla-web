import { createDragGhost, type Box } from '@scylla/ui/dnd';
import {
  keyboardTargets,
  PINS,
  sameTarget,
  stepTarget,
  type CardMove,
  type DropTarget,
  type KeyboardSection,
  type SectionKey,
} from '../presenters/project-sections.presenter.ts';

/** The card that moves, and the section where it was. */
interface Drag {
  id: string;
  name: string;
  from: SectionKey;
  /** The keyboard holds the card: it stays in its place, and the slot shows its new place. */
  keyboard: boolean;
  /** The box of the card when the person took it: a slot of its density has its height. */
  box: Box;
}

/** The end of the last drag, for the live region. `to`: the section of the drop; null: no drop. */
interface DragEnd {
  id: string;
  name: string;
  to: SectionKey | null;
}

export interface ProjectReorderOptions {
  isPinned?: (id: string) => boolean;
  /** The section of a card out of the pins: its group, or « No group ». */
  homeOf?: (id: string) => SectionKey | undefined;
  /** The sections of the page in their order, for the arrow keys. */
  layout?: () => readonly KeyboardSection[];
}

/**
 * The reorder mode of the projects page. The drops stay on the page until « Done » saves them;
 * « Cancel » or Escape forgets them. A pinned card in the pins moves only in the pins.
 *
 * A pointer drag: `pick` takes the card, and `ghost` lifts it and follows the pointer; `aim` gives
 * the section under the pointer and the place of the slot; `settle` keeps that place while the card
 * flies into its slot, then `drop` keeps the place. `cancel` sends the slot back to the place of the
 * card, and `release` ends the drag with no drop. The keyboard: `pick` with `keyboard`, `step`, then
 * `drop` or `cancel` and `release`.
 */
export const createProjectReorder = ({
  isPinned = () => false,
  homeOf = () => undefined,
  layout = () => [],
}: ProjectReorderOptions = {}) => {
  let moves = $state<CardMove[] | null>(null);
  let drag = $state<Drag | null>(null);
  let settling = $state(false);
  let target = $state<DropTarget | null>(null);
  let origin = $state<DropTarget | null>(null);
  let ended = $state<DragEnd | null>(null);
  // The section under the card that has it already: the pins of a pinned card, the group of a
  // card of the pins. It says so, and takes no drop.
  let refused = $state<SectionKey | null>(null);
  const ghost = createDragGhost();

  // A pinned card has its place in the pins: the pins take no new drop of it from another section.
  const pinnedNow = (id: string) =>
    isPinned(id) || !!moves?.some(move => move.to === PINS && move.id === id);
  const homeNow = (id: string) =>
    moves?.filter(move => move.id === id && move.to !== PINS).at(-1)?.to ?? homeOf(id);
  const accepts = (to: SectionKey) =>
    !!drag &&
    (drag.from !== PINS || to === PINS) &&
    !(to === PINS && drag.from !== PINS && pinnedNow(drag.id));
  const has = (key: SectionKey) =>
    !!drag &&
    !accepts(key) &&
    (key === PINS ? pinnedNow(drag.id) : drag.from === PINS && homeNow(drag.id) === key);
  const point = (next: DropTarget | null) => {
    if (!sameTarget(next, target)) target = next;
  };
  const end = (to: SectionKey | null) => {
    if (drag) ended = { id: drag.id, name: drag.name, to };
    drag = null;
    target = null;
    origin = null;
    refused = null;
    settling = false;
  };

  return {
    get active() {
      return moves !== null;
    },
    /** The drops; `null` out of the mode. */
    get moves(): readonly CardMove[] | null {
      return moves;
    },
    get drag(): Readonly<Drag> | null {
      return drag;
    },
    /** The lifted card: it follows the pointer, then flies into its slot. */
    get ghost() {
      return ghost;
    },
    get target(): Readonly<DropTarget> | null {
      return target;
    },
    /** The place of the card when the drag started. */
    get origin(): Readonly<DropTarget> | null {
      return origin;
    },
    /** The drag goes to a new place: a drop there moves the card. */
    get moved() {
      return !!drag && !!target && accepts(target.to) && !sameTarget(target, origin);
    },
    /** The card flies into its slot: the place does not change anymore. */
    get settling() {
      return settling;
    },
    /** The section under the card that has it already, and says « Already … », or null. */
    get refused(): SectionKey | null {
      return refused;
    },
    get ended(): Readonly<DragEnd> | null {
      return ended;
    },
    start() {
      moves = [];
      ended = null;
    },
    stop() {
      moves = null;
      ended = null;
      ghost.end();
      end(null);
      ended = null;
    },
    accepts,
    /** `nextId`: the card after it, so that the slot first shows at its own place. */
    pick(card: Omit<Drag, 'keyboard'>, nextId?: string, keyboard = false) {
      if (!moves || drag) return;
      drag = { ...card, keyboard };
      origin = { to: card.from, beforeId: nextId, header: false };
      target = origin;
      refused = null;
      settling = false;
      ended = null;
    },
    /**
     * The pointer is over `over`, and the card goes to `next` there. Out of each section, and over
     * a section that takes no drop of the card, the slot goes back to the place of the card.
     */
    aim(over: SectionKey | null, next: DropTarget | null) {
      if (!drag || drag.keyboard || settling) return;
      refused = over !== null && has(over) ? over : null;
      point(next && accepts(next.to) ? next : origin);
    },
    /** An arrow key: the slot goes one place back or on, also into the next section. */
    step(delta: -1 | 1) {
      if (!drag?.keyboard || !target) return;
      point(stepTarget(keyboardTargets(layout(), drag.id, accepts), target, delta));
    },
    /** The slot goes back to the place of the card before the drag. */
    cancel() {
      if (!drag || settling) return;
      refused = null;
      point(origin);
    },
    /** The card flies into its slot: the place stays. */
    settle() {
      if (drag) settling = true;
    },
    drop() {
      const to = target?.to ?? null;
      if (drag && target && moves && accepts(target.to) && !sameTarget(target, origin)) {
        moves = [...moves, { id: drag.id, to: target.to, beforeId: target.beforeId }];
        end(to);
        return;
      }
      end(null);
    },
    /** The drag ends with no drop: the card stays at its place. */
    release() {
      end(null);
    },
  };
};

export type ProjectReorderState = ReturnType<typeof createProjectReorder>;
