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
export const createProjectReorder = (isPinned: (id: string) => boolean = () => false) => {
  let moves = $state<CardMove[] | null>(null);
  let drag = $state<Drag | null>(null);
  let pointer = $state<Point>({ x: 0, y: 0 });
  let settling = $state(false);
  let vanishing = $state(false);
  let target = $state<DropTarget | null>(null);
  let origin: DropTarget | null = null;
  let ended = $state<DragEnd | null>(null);
  // The pins when the drag goes over them with a card that they have already.
  let refused = $state<SectionKey | null>(null);
  // The size of a cell of the section under the card, when its density is not the density of the
  // section of the card: the card takes its shape.
  let shape = $state<Pick<Box, 'width' | 'height'> | null>(null);

  /** The point where the person took the card, in its shape of now. */
  const grabOf = (card: Drag): Point =>
    shape
      ? {
          x: (card.grab.x * shape.width) / Math.max(card.box.width, 1),
          y: (card.grab.y * shape.height) / Math.max(card.box.height, 1),
        }
      : card.grab;

  // A pinned card has its place in the pins: the pins take no new drop of it from another section.
  const pinnedNow = (id: string) =>
    isPinned(id) || !!moves?.some(move => move.to === PINS && move.id === id);
  const accepts = (to: SectionKey) =>
    !!drag &&
    (drag.from !== PINS || to === PINS) &&
    !(to === PINS && drag.from !== PINS && pinnedNow(drag.id));
  const clear = () => {
    drag = null;
    target = null;
    origin = null;
    refused = null;
    settling = false;
    vanishing = false;
    shape = null;
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
      if (!drag) return { x: 0, y: 0 };
      const grab = grabOf(drag);
      return { x: pointer.x - grab.x - drag.box.left, y: pointer.y - grab.y - drag.box.top };
    },
    /** The box of the dragged card where it left its grid, in the shape of the section under it. */
    get box(): Box {
      if (!drag) return { left: 0, top: 0, width: 0, height: 0 };
      return shape ? { ...drag.box, ...shape } : drag.box;
    },
    /** The point where the person took the card, in its shape of now. */
    get grab(): Point {
      return drag ? grabOf(drag) : { x: 0, y: 0 };
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
    /** The section that shows « Already pinned » for the dragged card, or null. */
    get refused(): SectionKey | null {
      return refused;
    },
    /** The drag is over the pins with a pinned card: the slot goes back to the card. */
    refuse(to: SectionKey | null) {
      if (!drag || settling) return;
      refused = to;
      if (to) target = origin;
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
      const grab = grabOf(drag);
      pointer = { x: to.x + grab.x, y: to.y + grab.y };
    },
    /**
     * The card takes the size of a cell of the section under it, a section of another density;
     * `null` gives it its own size again.
     */
    reshape(size: Pick<Box, 'width' | 'height'> | null) {
      if (!drag || settling) return;
      if (size?.width === shape?.width && size?.height === shape?.height) return;
      shape = size;
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
