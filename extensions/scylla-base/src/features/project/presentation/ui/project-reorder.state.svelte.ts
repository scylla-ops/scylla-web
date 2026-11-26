import { PINS, type CardMove, type SectionKey } from '../presenters/project-sections.presenter.ts';

/** The card that moves, and the section where it was. */
interface Drag {
  id: string;
  name: string;
  from: SectionKey;
  /** The height of the card: the slot keeps it. */
  height: number;
}

/** Where the card goes: before a card of a section, or last. `header`: on the header. */
interface DropTarget {
  to: SectionKey;
  beforeId?: string;
  header: boolean;
}

/**
 * The reorder mode of the projects page. The drops stay on the page until « Done » saves them;
 * « Cancel » or Escape forgets them. A pinned card in the pins moves only in the pins.
 */
export const createProjectReorder = () => {
  let moves = $state<CardMove[] | null>(null);
  let drag = $state<Drag | null>(null);
  // The card leaves its place one frame after the start: the browser draws the dragged image first.
  let lifted = $state(false);
  let target = $state<DropTarget | null>(null);

  const accepts = (to: SectionKey) => !!drag && (drag.from !== PINS || to === PINS);
  const clear = () => {
    drag = null;
    target = null;
    lifted = false;
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
    get lifted() {
      return lifted;
    },
    get target(): Readonly<DropTarget> | null {
      return target;
    },
    start() {
      moves = [];
    },
    stop() {
      moves = null;
      clear();
    },
    accepts,
    /** `nextId`: the card after it, so that the slot first shows at its own place. */
    pick(card: Drag, nextId?: string) {
      const { id, from } = card;
      drag = card;
      lifted = false;
      target = null;
      setTimeout(() => {
        if (drag?.id !== id) return;
        lifted = true;
        target ??= { to: from, beforeId: nextId, header: false };
      });
    },
    /** Gives `false` when the section takes no drop of this card. */
    hover(to: SectionKey, beforeId?: string, header = false): boolean {
      if (!accepts(to)) return false;
      if (target?.to !== to || target.beforeId !== beforeId || target.header !== header) {
        target = { to, beforeId, header };
      }
      return true;
    },
    drop() {
      if (drag && target && moves && accepts(target.to)) {
        moves = [...moves, { id: drag.id, to: target.to, beforeId: target.beforeId }];
      }
      clear();
    },
    /** The drag ends with no drop: the card goes back to its place. */
    release: clear,
  };
};

export type ProjectReorderState = ReturnType<typeof createProjectReorder>;
