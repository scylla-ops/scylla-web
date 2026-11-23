import { untrack } from 'svelte';
import type { Attachment } from 'svelte/attachments';
import { ARRIVAL_MS } from './arrival.state.svelte.ts';

const CURTAIN_EASING = 'cubic-bezier(0.76, 0, 0.24, 1)';
const FLIGHT_X_EASING = 'cubic-bezier(0.65, 0, 0.35, 1)';
const FLIGHT_Y_EASING = 'cubic-bezier(0.4, 0, 0.2, 1)';
const SETTLE_EASING = 'cubic-bezier(0.16, 1, 0.3, 1)';
const PANEL_FADE = { delay: 150, duration: 400 };
const FRAME_SETTLE_MS = 650;
const ROWS = { delay: 250, gap: 70, duration: 360 };
/** The separator lights in 100 ms at the start of the curtain and goes out in the last 100 ms. */
const SEPARATOR_EDGE_MS = 100;

/** In `logo_lockup.svg` (145 high), the mark is the square of 72 at the top 48.28 and the left 0. */
const LOCKUP = { height: 145, markTop: 48.28, markSize: 72 };

export interface MarkBox {
  centerX: number;
  centerY: number;
  size: number;
}

/** The mark inside the box of a lockup image. */
export const lockupMark = (lockup: DOMRect): MarkBox => {
  const unit = lockup.height / LOCKUP.height;
  return {
    centerX: lockup.left + (LOCKUP.markSize / 2) * unit,
    centerY: lockup.top + (LOCKUP.markTop + LOCKUP.markSize / 2) * unit,
    size: LOCKUP.markSize * unit,
  };
};

/** The elements in the view, in rows: the elements of a row have the same top. */
export const rowsOf = (elements: readonly Element[]): Element[][] =>
  elements
    .map(element => ({ element, box: element.getBoundingClientRect() }))
    .filter(({ box }) => box.bottom > 0 && box.top < window.innerHeight)
    .map(({ element, box }) => ({ element, top: box.top }))
    .sort((a, b) => a.top - b.top)
    .reduce<{ top: number; row: Element[] }[]>((rows, { element, top }) => {
      const last = rows.at(-1);
      if (last && Math.round(last.top) === Math.round(top)) last.row.push(element);
      else rows.push({ top, row: [element] });
      return rows;
    }, [])
    .map(({ row }) => row);

const part = (root: Element, name: string): Element | null =>
  root.querySelector(`[data-part="${name}"]`);

/**
 * The panel grows from the 40 % of the sign-in page to the full width. The mark stays at its
 * center, and the separator lights in primary while it moves.
 */
export const closeCurtain = (root: Element): Animation[] => {
  const timing: KeyframeAnimationOptions = {
    duration: ARRIVAL_MS.curtain,
    easing: CURTAIN_EASING,
    fill: 'forwards',
  };
  const edge = SEPARATOR_EDGE_MS / ARRIVAL_MS.curtain;
  const animations = [
    part(root, 'arrival-panel')?.animate([{ width: '40%' }, { width: '100%' }], timing),
    part(root, 'arrival-mark')?.animate([{ left: '20%' }, { left: '50%' }], timing),
    part(root, 'arrival-separator')?.animate(
      [
        { opacity: 0, easing: 'ease-out' },
        { opacity: 1, offset: edge },
        { opacity: 1, offset: 1 - edge, easing: 'ease-in' },
        { opacity: 0 },
      ],
      { duration: ARRIVAL_MS.curtain, fill: 'forwards' },
    ),
  ];
  return animations.filter(animation => animation !== undefined);
};

/** The page under the overlay settles, and its widgets come up row by row. */
const revealPage = (overlay: Element) => {
  for (let page = overlay.previousElementSibling; page; page = page.previousElementSibling) {
    page.animate([{ scale: '1.03' }, { scale: '1' }], {
      duration: FRAME_SETTLE_MS,
      easing: SETTLE_EASING,
    });
  }
  rowsOf([...document.querySelectorAll('main [data-slot="widget"]')]).forEach((row, index) =>
    row.forEach(widget =>
      widget.animate(
        [
          { opacity: 0, translate: '0 12px' },
          { opacity: 1, translate: '0 0' },
        ],
        {
          delay: ROWS.delay + index * ROWS.gap,
          duration: ROWS.duration,
          easing: 'ease-out',
          fill: 'backwards',
        },
      ),
    ),
  );
};

const land = (overlay: Element, target: DOMRect | null) => {
  const fadeOut = (element: Element | null) =>
    element?.animate([{ opacity: 1 }, { opacity: 0 }], {
      ...PANEL_FADE,
      easing: 'ease-out',
      fill: 'forwards',
    });

  fadeOut(part(overlay, 'arrival-panel'));
  revealPage(overlay);

  const mark = part(overlay, 'arrival-mark');
  const flight = part(overlay, 'arrival-flight');
  if (!mark || !target) {
    fadeOut(flight);
    return;
  }
  const from = mark.getBoundingClientRect();
  const to = lockupMark(target);
  const dx = to.centerX - (from.left + from.width / 2);
  const dy = to.centerY - (from.top + from.height / 2);
  const timing = { duration: ARRIVAL_MS.landing, fill: 'forwards' } as const;
  mark.animate(
    [{ transform: 'none' }, { transform: `translateX(${dx}px) scale(${to.size / from.width})` }],
    { ...timing, easing: FLIGHT_X_EASING },
  );
  flight?.animate([{ transform: 'none' }, { transform: `translateY(${dy}px)` }], {
    ...timing,
    easing: FLIGHT_Y_EASING,
  });
};

/**
 * The curtain closes. Then, at `landing`, the mark flies to the logo of the shell (`target`), and
 * the panel fades out over the page. With no logo on the screen, the mark fades out with the panel.
 */
export const arrive =
  (landing: () => boolean, target: () => DOMRect | null): Attachment =>
  overlay => {
    const curtain = closeCurtain(overlay);
    $effect(() => {
      if (!landing()) return;
      untrack(() => {
        // A hidden tab can hold the curtain before its first frame: the mark must leave the center.
        curtain.forEach(animation => animation.finish());
        land(overlay, target());
      });
    });
    return () => curtain.forEach(animation => animation.cancel());
  };
