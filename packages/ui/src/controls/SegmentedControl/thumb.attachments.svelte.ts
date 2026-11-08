import { untrack } from 'svelte';
import { prefersReducedMotion } from '../../motion/reduced-motion.ts';
import { thumbKeyframes, type Box, type ThumbMove } from './thumb-motion.ts';

const boxOf = (element: HTMLElement): Box => ({
  x: element.offsetLeft,
  y: element.offsetTop,
  width: element.offsetWidth,
  height: element.offsetHeight,
});

const sameBox = (a: Box, b: Box) =>
  a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;

/** Where the thumb is now, also in the middle of a move. */
const shownBox = (thumb: HTMLElement): Box => {
  const style = getComputedStyle(thumb);
  return {
    x: parseFloat(style.left) || 0,
    y: parseFloat(style.top) || 0,
    width: parseFloat(style.width) || 0,
    height: parseFloat(style.height) || 0,
  };
};

const place = (thumb: HTMLElement, box: Box) => {
  thumb.style.left = `${box.x}px`;
  thumb.style.top = `${box.y}px`;
  thumb.style.width = `${box.width}px`;
  thumb.style.height = `${box.height}px`;
};

/**
 * Puts the thumb under the selected segment, and moves it there when the selection changes. The
 * thumb is a child of the track, beside the segments. A ResizeObserver on the track and the
 * segments makes the thumb follow a change of label or count.
 */
export const followSelection = (selected: () => string) => (thumb: HTMLElement) => {
  const track = thumb.parentElement;
  if (!track) return;

  let value = untrack(selected);
  let target: Box | null = null;
  let motion: Animation | null = null;
  const watched = new WeakSet<Element>();

  const segments = () =>
    [...track.children].filter(
      (child): child is HTMLElement =>
        child instanceof HTMLElement && child.dataset.slot === 'toggle-group-item',
    );

  const watch = (elements: Element[]) => {
    for (const element of elements) {
      if (watched.has(element)) continue;
      watched.add(element);
      observer.observe(element);
    }
  };

  const follow = (move: ThumbMove | null) => {
    const all = segments();
    watch([track, ...all]);
    const segment = all.find(item => item.dataset.value === value);
    thumb.hidden = !segment;
    if (!segment) {
      target = null;
      return;
    }
    const next = boxOf(segment);
    if (target && sameBox(target, next)) return;
    const from = motion ? shownBox(thumb) : target;
    motion?.cancel();
    motion = null;
    target = next;
    place(thumb, next);
    if (!from || !move || sameBox(from, next)) return;
    const { keyframes, duration } = thumbKeyframes(from, next, {
      move,
      reduced: prefersReducedMotion(),
    });
    const running = thumb.animate(keyframes, { duration });
    motion = running;
    running.onfinish = () => {
      if (motion === running) motion = null;
    };
  };

  const observer = new ResizeObserver(() => follow(motion ? 'settle' : null));

  $effect(() => {
    const next = selected();
    untrack(() => {
      const changed = next !== value;
      value = next;
      follow(changed ? 'stretch' : null);
    });
  });

  return () => {
    observer.disconnect();
    motion?.cancel();
  };
};
