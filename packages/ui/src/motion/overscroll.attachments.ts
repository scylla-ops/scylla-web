import { prefersReducedMotion } from './reduced-motion.ts';

export type OverscrollGlowOptions = {
  /** The edges that glow when a push goes past the end. */
  edges: 'bottom' | 'both';
  /** The size of the halo: a page, a sidebar list or a dialog. */
  size: 'page' | 'sidebar' | 'dialog';
};

/** Pull, in pixels, at which the glow has risen to 63 %. */
const PULL_SCALE = 160;
/** A wheel event under this delta is noise. */
const MIN_DELTA = 4;
/** No event for this long: the push is over. */
const RELEASE_MS = 120;
/** Intensity of one key press at the end. */
const KEY_INTENSITY = 0.6;
/** Intensity under reduced motion: the glow shows, it does not move. */
const STILL_INTENSITY = 0.5;

const END_KEYS = new Set(['End', 'PageDown', ' ', 'ArrowDown']);
const START_KEYS = new Set(['Home', 'PageUp', 'ArrowUp']);

type Edge = 'b' | 't';

const atEnd = (node: HTMLElement, edge: Edge) =>
  edge === 'b' ? node.scrollTop + node.clientHeight >= node.scrollHeight - 1 : node.scrollTop <= 0;

/** A scroll area inside `node` that can still move in this direction takes the push itself. */
const innerScrollerMoves = (target: EventTarget | null, node: HTMLElement, down: boolean) => {
  let element = target instanceof HTMLElement ? target : null;
  while (element && element !== node) {
    const overflow = getComputedStyle(element).overflowY;
    if (
      (overflow === 'auto' || overflow === 'scroll') &&
      element.scrollHeight > element.clientHeight
    ) {
      const room = down
        ? element.scrollHeight - element.clientHeight - element.scrollTop
        : element.scrollTop;
      if (room > 1) return true;
    }
    element = element.parentElement;
  }
  return false;
};

/** A key in a field moves the caret: it does not push the page. */
const isField = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));

/**
 * A light halo behind the content, at the edge of a scroll area, while the person pushes past
 * the end (wheel, touch, or a key that goes to the end). Not shown otherwise.
 *
 * It writes `--overscroll-b` and `--overscroll-t` (0 to 1) and `data-overscroll="rise|fall"`; the
 * halo is drawn by `.overscroll-glow` in `styles.css` as background layers of the element
 * itself, so it stays under the children and never covers them.
 */
export const overscrollGlow =
  ({ edges, size }: OverscrollGlowOptions) =>
  (node: HTMLElement) => {
    node.classList.add('overscroll-glow', `overscroll-glow-${size}`);
    let pull = 0;
    let edge: Edge | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let touchY: number | undefined;

    const write = (which: Edge, value: number) =>
      node.style.setProperty(`--overscroll-${which}`, String(value));

    const release = () => {
      timer = undefined;
      pull = 0;
      edge = undefined;
      node.dataset.overscroll = 'fall';
      write('b', 0);
      write('t', 0);
    };

    const show = (which: Edge, intensity: number) => {
      if (edge && edge !== which) write(edge, 0);
      edge = which;
      if (size === 'dialog') {
        const footer = node.querySelector<HTMLElement>('[data-slot=dialog-footer]');
        node.style.setProperty('--overscroll-offset-b', `${footer?.offsetHeight ?? 0}px`);
      }
      node.dataset.overscroll = 'rise';
      write(which, prefersReducedMotion() ? STILL_INTENSITY : intensity);
      clearTimeout(timer);
      timer = setTimeout(release, RELEASE_MS);
    };

    const push = (which: Edge, amount: number) => {
      pull = edge === which ? pull + amount : amount;
      show(which, 1 - Math.exp(-pull / PULL_SCALE));
    };

    const edgeFor = (down: boolean): Edge | undefined => {
      if (down) return atEnd(node, 'b') ? 'b' : undefined;
      return edges === 'both' && atEnd(node, 't') ? 't' : undefined;
    };

    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) < MIN_DELTA) return;
      const down = event.deltaY > 0;
      const which = edgeFor(down);
      if (which && !innerScrollerMoves(event.target, node, down)) {
        push(which, Math.abs(event.deltaY));
      }
    };

    const onTouchStart = (event: TouchEvent) => {
      touchY = event.touches[0]?.clientY;
    };
    const onTouchMove = (event: TouchEvent) => {
      const y = event.touches[0]?.clientY;
      if (touchY === undefined || y === undefined || touchY === y) return;
      const down = touchY > y;
      const which = edgeFor(down);
      if (which && !innerScrollerMoves(event.target, node, down)) {
        pull = Math.abs(touchY - y);
        edge = which;
        show(which, 1 - Math.exp(-pull / PULL_SCALE));
      }
    };
    const onTouchEnd = () => {
      touchY = undefined;
      if (timer) {
        clearTimeout(timer);
        release();
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      // The page has no focus of its own: its keys reach `body`.
      const inside = node.contains(event.target as Node | null);
      if (!inside && !(size === 'page' && event.target === document.body)) return;
      if (isField(event.target)) return;
      const down = END_KEYS.has(event.key) && !(event.key === ' ' && event.shiftKey);
      const up = START_KEYS.has(event.key) || (event.key === ' ' && event.shiftKey);
      if (!down && !up) return;
      const which = edgeFor(down);
      if (which && !innerScrollerMoves(event.target, node, down)) show(which, KEY_INTENSITY);
    };

    node.addEventListener('wheel', onWheel, { passive: true });
    node.addEventListener('touchstart', onTouchStart, { passive: true });
    node.addEventListener('touchmove', onTouchMove, { passive: true });
    node.addEventListener('touchend', onTouchEnd);
    node.addEventListener('touchcancel', onTouchEnd);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      clearTimeout(timer);
      node.removeEventListener('wheel', onWheel);
      node.removeEventListener('touchstart', onTouchStart);
      node.removeEventListener('touchmove', onTouchMove);
      node.removeEventListener('touchend', onTouchEnd);
      node.removeEventListener('touchcancel', onTouchEnd);
      document.removeEventListener('keydown', onKeyDown);
      node.classList.remove('overscroll-glow', `overscroll-glow-${size}`);
    };
  };
