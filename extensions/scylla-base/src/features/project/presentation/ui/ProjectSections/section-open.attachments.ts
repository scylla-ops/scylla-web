import { ENTER_EASING, ENTER_MS, prefersReducedMotion, RISE_PX } from '@scylla/ui';

/** The delay between two cards that come in, and the last card that waits for its turn. */
const STAGGER_MS = 35;
const STAGGERED_CARDS = 9;
/** The highlight of a card that a chip opened: it fades out over this time. */
const HIGHLIGHT_MS = 1400;

/**
 * The cards of a section that the person opens fade in one after the other, as `enter`. The
 * attachment goes on the grid; the first paint of the page has none.
 */
export const staggerCards = (grid: HTMLElement) => {
  if (prefersReducedMotion()) return;
  [...grid.children].forEach((cell, index) =>
    cell.animate(
      [
        { opacity: 0, transform: `translateY(${RISE_PX}px)` },
        { opacity: 1, transform: 'none' },
      ],
      {
        duration: ENTER_MS,
        delay: Math.min(index, STAGGERED_CARDS) * STAGGER_MS,
        easing: ENTER_EASING,
        fill: 'backwards',
      },
    ),
  );
};

/**
 * The card that a chip of the folded section opened: the page scrolls to it, and a ring around it
 * fades out. With a reduced motion, the scroll is instant and the ring goes at once at the end.
 * `done` is called at the end of the highlight.
 */
export const revealCard = (done: () => void) => (cell: HTMLElement) => {
  const reduced = prefersReducedMotion();
  let animation: Animation | undefined;
  const frame = requestAnimationFrame(() => {
    cell.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
    const card = cell.firstElementChild ?? cell;
    animation = card.animate(
      [
        { boxShadow: '0 0 0 3px var(--ring)' },
        { boxShadow: '0 0 0 3px var(--ring)', offset: 0.5 },
        { boxShadow: '0 0 0 3px transparent' },
      ],
      { duration: HIGHLIGHT_MS, easing: reduced ? 'step-end' : 'ease-in' },
    );
    animation.onfinish = done;
  });
  return () => {
    cancelAnimationFrame(frame);
    if (animation) animation.onfinish = null;
  };
};
