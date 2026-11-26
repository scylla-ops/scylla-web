import { ENTER_EASING, motionDuration } from '@scylla/ui';

export const ROW_APPEAR_MS = 140;

/**
 * A row that a new search shows fades in. A row that stays keeps its element, so it does not
 * flash at each letter. No exit: a row that leaves must not stay in the keyboard order.
 */
export const appearRow = (node: HTMLElement): void => {
  const duration = motionDuration(ROW_APPEAR_MS);
  if (duration > 0) {
    node.animate([{ opacity: 0 }, { opacity: 1 }], { duration, easing: ENTER_EASING });
  }
};
