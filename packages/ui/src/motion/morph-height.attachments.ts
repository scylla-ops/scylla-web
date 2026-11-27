import { heightAt, heightMove, moveEnded, retarget, type HeightMove } from './height-move.ts';
import { prefersReducedMotion } from './reduced-motion.ts';

/** Less than one pixel: no move. */
const SAME_PX = 0.5;
/** After a swap, the box follows the new part for this time: the data that it loads moves it. */
const FOLLOW_MS = 1000;

/** The box of `morphHeight`: its parts are in one grid cell, each one with its own height. */
export const MORPH_BOX_CLASS =
  'grid grid-cols-[minmax(0,1fr)] items-start *:col-start-1 *:row-start-1';

/**
 * A box whose part changes in place, e.g. a section that swaps its line of chips for its cards.
 * Each part is one element, a child of the box (`MORPH_BOX_CLASS`), with `in:enter` and
 * `out:exit`: the part that goes (inert while it fades) is over the part that comes. The box
 * moves its height once, from the part that goes to the part that comes: as `unfold` to grow, as
 * `fold` to shrink, and it clips the parts while it moves.
 *
 * The first frame measures the end height, after the content of the new part mounted (the
 * `{#await}` of a widget zone). While the box moves, it follows the new part: a part that grows
 * later (its data loads) changes the end of the move from the place and the speed of the box,
 * with no jump. After the move, the box keeps the height of the new part up to `FOLLOW_MS` after
 * the swap: data that loads later moves the box again, it does not jump. Then the box has no
 * height of its own, and a change in a part is instant. With a reduced motion, nothing moves.
 * The box has no padding and no border: give them to the parts.
 */
export const morphHeight = (box: HTMLElement) => {
  let move: HeightMove | null = null;
  let frame = 0;
  /** The first frame of the swap. */
  let swapped: number | null = null;

  const parts = () => [...box.children] as HTMLElement[];
  // The height of the layout: the transform of `enter` and of a stagger does not change it.
  const heightOf = (some: HTMLElement[]) =>
    Math.max(0, ...some.map(part => parseFloat(getComputedStyle(part).height) || 0));
  const leaving = () => parts().filter(part => part.inert);
  const target = () => heightOf(parts().filter(part => !part.inert));

  const hold = (height: number) => {
    box.style.height = `${height}px`;
    box.style.overflow = 'clip';
  };
  const release = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    move = null;
    swapped = null;
    box.style.removeProperty('height');
    box.style.removeProperty('overflow');
  };

  const step = (now: number) => {
    frame = 0;
    swapped ??= now;
    const to = target();
    if (move && Math.abs(to - move.to) >= SAME_PX) move = retarget(move, to, now);
    if (!move) {
      const from = parseFloat(box.style.height) || 0;
      if (Math.abs(to - from) >= SAME_PX) move = heightMove(from, to, now);
    }
    if (move && !moveEnded(move, now)) {
      hold(heightAt(move, now));
      frame = requestAnimationFrame(step);
      return;
    }
    // A part that still fades out would give its height to the box: its removal ends the move.
    if (leaving().length > 0) {
      hold(to);
    } else if (now - swapped < FOLLOW_MS) {
      // No clip at rest: the next change clips again before its frame shows.
      box.style.height = `${to}px`;
      box.style.removeProperty('overflow');
      frame = requestAnimationFrame(step);
    } else {
      release();
    }
  };

  const changed = (records: MutationRecord[]) => {
    const isPart = (node: Node) => node instanceof Element && node.parentElement === box;
    const added = records.some(
      record => record.target === box && [...record.addedNodes].some(isPart),
    );
    const parted =
      added ||
      records.some(record =>
        record.type === 'attributes'
          ? isPart(record.target)
          : record.target === box && [...record.removedNodes].some(node => node instanceof Element),
      );
    if (!parted) return;
    if (prefersReducedMotion()) {
      release();
      return;
    }
    if (box.style.height === '') {
      // At rest, the box had the height of the part that goes. A part removed with no fade
      // leaves nothing to move from.
      const from = heightOf(leaving());
      if (from === 0 && !added) return;
      hold(from);
    }
    if (added) swapped = null;
    if (!frame) frame = requestAnimationFrame(step);
  };

  // The tree, for the `inert` of the parts; only the children of the box are parts.
  const observer = new MutationObserver(changed);
  observer.observe(box, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['inert'],
  });
  return () => {
    observer.disconnect();
    release();
  };
};
