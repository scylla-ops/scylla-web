import type { Attachment } from 'svelte/attachments';
import { DRAG_SLOP_PX, edgeScroll, TOUCH_HOLD_MS, TOUCH_SLOP_PX, type Point } from './geometry.ts';

export interface PointerDragOptions<T> {
  /** The item that a press on this element takes, or null: no drag (a click, a busy owner). */
  pick: (target: Element) => T | null;
  /** The press became a drag. `at`: the pointer now; `from`: where the button went down. */
  start: (item: T, at: Point, from: Point) => void;
  /** The pointer moved, or the page scrolled under it. */
  move: (at: Point) => void;
  /** The drag ends: `true` on a release, `false` on Escape, a lost pointer or a lost window. */
  end: (drop: boolean) => void;
}

interface Press<T> {
  item: T;
  pointerId: number;
  touch: boolean;
  from: Point;
}

/** The nearest parent that scrolls, else the page. */
const scrollerOf = (node: HTMLElement): HTMLElement | null => {
  for (let parent = node.parentElement; parent; parent = parent.parentElement) {
    const { overflowY } = getComputedStyle(parent);
    if (/auto|scroll/.test(overflowY) && parent.scrollHeight > parent.clientHeight) return parent;
  }
  return document.scrollingElement as HTMLElement | null;
};

/**
 * The pointer side of a drag, on the root of the items. A press on an item that `pick` takes
 * becomes a drag after a move of 5 px with a mouse or a pen, or after a hold of 250 ms with a
 * finger: a click stays a click, and a quick move of a finger scrolls the page. During the drag,
 * the page scrolls near the top and the bottom of its scroller, faster near the edge; a finger
 * does not scroll it and a long press opens no menu. Escape, a lost pointer and a lost window end
 * the drag with no drop. The click that ends a drag does nothing.
 */
export const dragWithPointer =
  <T>(options: () => PointerDragOptions<T>): Attachment<HTMLElement> =>
  root => {
    let press: Press<T> | null = null;
    let dragging = false;
    let pointer: Point = { x: 0, y: 0 };
    let scroller: HTMLElement | null = null;
    let frame = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const scroll = () => {
      if (!dragging || !scroller) return;
      const page = scroller === document.scrollingElement;
      const { top, bottom } = page
        ? { top: 0, bottom: innerHeight }
        : scroller.getBoundingClientRect();
      const step = edgeScroll(pointer.y, Math.max(top, 0), Math.min(bottom, innerHeight));
      if (step !== 0) scroller.scrollTop += step;
      frame = requestAnimationFrame(scroll);
    };

    const begin = () => {
      if (!press) return;
      dragging = true;
      options().start(press.item, pointer, press.from);
      options().move(pointer);
      scroller = scrollerOf(root);
      frame = requestAnimationFrame(scroll);
    };

    // The click that ends a drag lands on the item or under it: it does nothing.
    const swallow = (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
    };
    const swallowNextClick = () => {
      window.addEventListener('click', swallow, { capture: true, once: true });
      setTimeout(() => window.removeEventListener('click', swallow, { capture: true }));
    };

    const finish = (drop: boolean) => {
      const was = dragging;
      reset();
      if (!was) return;
      if (drop) swallowNextClick();
      options().end(drop);
    };

    const onmove = (event: PointerEvent) => {
      if (event.pointerId !== press?.pointerId) return;
      pointer = { x: event.clientX, y: event.clientY };
      if (!dragging) {
        const moved = Math.hypot(pointer.x - press.from.x, pointer.y - press.from.y);
        if (press.touch) {
          if (moved > TOUCH_SLOP_PX) reset();
          return;
        }
        if (moved < DRAG_SLOP_PX) return;
        begin();
        return;
      }
      options().move(pointer);
    };
    const onup = (event: PointerEvent) => {
      if (event.pointerId === press?.pointerId) finish(true);
    };
    const oncancel = (event: PointerEvent) => {
      if (event.pointerId === press?.pointerId) finish(false);
    };
    const onblur = () => finish(false);
    // First of all the handlers: Escape ends the drag only, not a mode of the page.
    const onkeydown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !dragging) return;
      event.preventDefault();
      event.stopPropagation();
      finish(false);
    };
    const onscroll = () => {
      if (dragging) options().move(pointer);
    };
    const ontouchmove = (event: TouchEvent) => {
      if (dragging) event.preventDefault();
    };
    const oncontextmenu = (event: Event) => {
      if (press) event.preventDefault();
    };

    const listen = (on: boolean) => {
      const method = on ? 'addEventListener' : 'removeEventListener';
      window[method]('pointermove', onmove as EventListener);
      window[method]('pointerup', onup as EventListener);
      window[method]('pointercancel', oncancel as EventListener);
      window[method]('keydown', onkeydown as EventListener, true);
      window[method]('blur', onblur);
      window[method]('scroll', onscroll, true);
    };

    function reset() {
      clearTimeout(timer);
      cancelAnimationFrame(frame);
      if (press) listen(false);
      press = null;
      dragging = false;
    }

    const ondown = (event: PointerEvent) => {
      if (press || event.button !== 0 || !event.isPrimary) return;
      const target = event.target as Element | null;
      const item = target && root.contains(target) ? options().pick(target) : null;
      if (item === null) return;
      const touch = event.pointerType === 'touch';
      pointer = { x: event.clientX, y: event.clientY };
      press = { item, pointerId: event.pointerId, touch, from: pointer };
      listen(true);
      // A mouse selects no text and starts no native drag; a finger waits for its hold.
      if (touch) timer = setTimeout(begin, TOUCH_HOLD_MS);
      else event.preventDefault();
    };

    root.addEventListener('pointerdown', ondown);
    root.addEventListener('touchmove', ontouchmove, { passive: false });
    root.addEventListener('contextmenu', oncontextmenu);
    return () => {
      const was = dragging;
      reset();
      root.removeEventListener('pointerdown', ondown);
      root.removeEventListener('touchmove', ontouchmove);
      root.removeEventListener('contextmenu', oncontextmenu);
      if (was) options().end(false);
    };
  };
