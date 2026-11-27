import type { Attachment } from 'svelte/attachments';

export interface KeyboardDragOptions {
  /** The keyboard holds this item now. */
  lifted: () => boolean;
  /** Space or Enter on a resting item: the keyboard takes it. */
  pick: () => void;
  /** An arrow key: -1 is one place back (up or left), 1 one place on (down or right). */
  step: (delta: -1 | 1) => void;
  /** Space or Enter again, or the focus goes away: the item stays at its new place. */
  drop: () => void;
  /** Escape: the item goes back to its place. */
  cancel: () => void;
}

const BACK = new Set(['ArrowUp', 'ArrowLeft']);
const ON = new Set(['ArrowDown', 'ArrowRight']);

/**
 * The keyboard side of a drag, on the handle of an item (the item itself when it is the handle):
 * Space or Enter takes the item, the arrow keys move it one place, Space or Enter drops it and
 * Escape cancels. Escape stops there: a mode of the page stays. When the focus leaves the handle,
 * the item stays where it is. When the owner moves the handle to a new element (the item changed
 * its section), the old one goes away with no drop: the owner gives the focus to the new one.
 */
export const dragWithKeys =
  (options: () => KeyboardDragOptions): Attachment<HTMLElement> =>
  element => {
    const onkeydown = (event: KeyboardEvent) => {
      if (event.target !== element || event.altKey || event.ctrlKey || event.metaKey) return;
      const { lifted, pick, step, drop, cancel } = options();
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        if (lifted()) drop();
        else pick();
        return;
      }
      if (!lifted()) return;
      if (BACK.has(event.key) || ON.has(event.key)) {
        event.preventDefault();
        step(BACK.has(event.key) ? -1 : 1);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        cancel();
      }
    };
    const onfocusout = () => {
      setTimeout(() => {
        const { lifted, drop } = options();
        if (element.isConnected && lifted() && document.activeElement !== element) drop();
      });
    };
    element.addEventListener('keydown', onkeydown);
    element.addEventListener('focusout', onfocusout);
    return () => {
      element.removeEventListener('keydown', onkeydown);
      element.removeEventListener('focusout', onfocusout);
    };
  };
