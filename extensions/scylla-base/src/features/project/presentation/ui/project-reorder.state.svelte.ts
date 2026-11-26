import {
  PINS,
  type CardMove,
  type DropTarget,
  type SectionKey,
} from '../presenters/project-sections.presenter.ts';
import type { Box, LiftedMotion, Point } from '../presenters/sortable.presenter.ts';

/** The card that moves, and the section where it was. */
interface Drag {
  id: string;
  name: string;
  from: SectionKey;
  /** The box of the card when the person took it: the card leaves the grid there. */
  box: Box;
  /** The point where the person took the card, from its top left corner. */
  grab: Point;
}

/** The end of the last drag, for the live region. `to`: the section of the drop; null: no drop. */
interface DragEnd {
  id: string;
  name: string;
  to: SectionKey | null;
}

const sameTarget = (a: DropTarget | null, b: DropTarget | null) =>
  a?.to === b?.to && a?.beforeId === b?.beforeId;

/**
 * The reorder mode of the projects page. The drops stay on the page until « Done » saves them;
 * « Cancel » or Escape forgets them. A pinned card in the pins moves only in the pins.
 *
 * A drag: `pick` lifts the card, `follow` moves it with the pointer, `hover` moves the slot,
 * `settle` sends the card to its slot, then `drop` keeps the place. `cancel` sends the slot back
 * to the place of the card, and `release` ends the drag with no drop.
 */
export const createProjectReorder = () => {
  let moves = $state<CardMove[] | null>(null);
  let drag = $state<Drag | null>(null);
  let pointer = $state<Point>({ x: 0, y: 0 });
  let settling = $state(false);
  let vanishing = $state(false);
  let target = $state<DropTarget | null>(null);
  let origin: DropTarget | null = null;
  let ended = $state<DragEnd | null>(null);

  const accepts = (to: SectionKey) => !!drag && (drag.from !== PINS || to === PINS);
  const clear = () => {
    drag = null;
    target = null;
    origin = null;
    settling = false;
    vanishing = false;
  };
  const end = (to: SectionKey | null) => {
    if (drag) ended = { id: drag.id, name: drag.name, to };
    clear();
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
    get target(): Readonly<DropTarget> | null {
      return target;
    },
    /** How far the dragged card is from its box. */
    get offset(): Point {
      return drag
        ? { x: pointer.x - drag.grab.x - drag.box.left, y: pointer.y - drag.grab.y - drag.box.top }
        : { x: 0, y: 0 };
    },
    /** The dragged card goes to its slot: it does not follow the pointer anymore. */
    get settling() {
      return settling;
    },
    /** The card follows the pointer, settles in its slot, or vanishes into a closed section. */
    get motion(): LiftedMotion {
      if (!settling) return 'follow';
      return vanishing ? 'vanish' : 'settle';
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
      clear();
    },
    accepts,
    /** `nextId`: the card after it, so that the slot first shows at its own place. */
    pick(card: Drag, nextId?: string) {
      drag = card;
      pointer = { x: card.box.left + card.grab.x, y: card.box.top + card.grab.y };
      settling = false;
      origin = { to: card.from, beforeId: nextId, header: false };
      target = origin;
      ended = null;
    },
    follow(point: Point) {
      if (drag && !settling) pointer = point;
    },
    /** Gives `false` when the section takes no drop of this card. */
    hover(to: SectionKey, beforeId?: string, header = false): boolean {
      if (!accepts(to)) return false;
      if (settling) return true;
      if (target?.to !== to || target.beforeId !== beforeId || target.header !== header) {
        target = { to, beforeId, header };
      }
      return true;
    },
    /** The slot goes back to the place of the card before the drag. */
    cancel() {
      if (drag && !settling) target = origin;
    },
    /** The top left corner of the card goes to `to`: its slot, or the header with `vanish`. */
    settle(to: Point, vanish = false) {
      if (!drag) return;
      settling = true;
      vanishing = vanish;
      pointer = { x: to.x + drag.grab.x, y: to.y + drag.grab.y };
    },
    drop() {
      if (drag && target && moves && accepts(target.to) && !sameTarget(target, origin)) {
        moves = [...moves, { id: drag.id, to: target.to, beforeId: target.beforeId }];
      }
      end(target?.to ?? null);
    },
    /** The drag ends with no drop: the card stays at its place. */
    release() {
      end(null);
    },
  };
};

export type ProjectReorderState = ReturnType<typeof createProjectReorder>;
