import { ENTER_EASING } from '../../motion/enter.ts';
import { prefersReducedMotion } from '../../motion/reduced-motion.ts';
import { SCREEN_MS } from '../../motion/screen-slide.ts';

/** Less than one pixel: no move. */
const SAME_PX = 0.5;

/**
 * The box of a `ScreenStack` moves its height when its screen changes, in the time of the slide:
 * from its height before the change to its height after it. The box has the height of the taller
 * screen, and a screen that goes back is out of the flow: a second screen that is not taller than
 * the main one moves nothing (a dialog), a taller one makes room as it comes (a field on a page).
 * A change in the middle of a move starts from the height on screen. With a reduced motion,
 * nothing moves.
 */
export const followScreenHeight = (screen: () => unknown) => (box: HTMLElement) => {
  // The height on screen before the change: the observer gives it after each layout, thus also
  // in the middle of a move. Svelte updates the DOM before the effect below runs.
  let shown = box.getBoundingClientRect().height;
  const observer = new ResizeObserver(() => {
    shown = box.getBoundingClientRect().height;
  });
  observer.observe(box);
  let move: Animation | undefined;

  $effect(() => {
    screen();
    const from = shown;
    move?.cancel();
    move = undefined;
    const to = box.getBoundingClientRect().height;
    if (Math.abs(to - from) < SAME_PX || prefersReducedMotion()) return;
    // The screens are clipped while the box moves: the one that goes back is taller.
    move = box.animate(
      [
        { height: `${from}px`, overflow: 'clip' },
        { height: `${to}px`, overflow: 'clip' },
      ],
      { duration: SCREEN_MS, easing: ENTER_EASING },
    );
  });

  return () => {
    observer.disconnect();
    move?.cancel();
  };
};
