import type { Attachment } from 'svelte/attachments';
import { prefersReducedMotion } from '@scylla/ui';

/** `scylla-spin` of `@scylla/ui/styles.css`: three quarters in 40 % of the time, then the last. */
const SPIN: Keyframe[] = [
  { transform: 'rotate(0deg)', easing: 'ease-in-out' },
  { transform: 'rotate(270deg)', offset: 0.4, easing: 'ease-in-out' },
  { transform: 'rotate(360deg)' },
];
export const SPIN_MS = 1800;
/** The time of a full quarter turn when the spin stops. */
export const SETTLE_MS = 300;

/** The angle in degrees, 0 to 360, of a computed `transform` (`matrix(a, b, …)`). */
export const angleOf = (transform: string): number => {
  const match = /^matrix\(\s*([^,]+),\s*([^,]+)/.exec(transform);
  if (!match) return 0;
  const degrees = (Math.atan2(Number(match[2]), Number(match[1])) * 180) / Math.PI;
  return (degrees + 360) % 360;
};

/**
 * The mark turns while `spinning` is true. When it stops, it does not jump back to 0: it eases
 * out to the next quarter turn, which looks the same as 0 because the four dots are a square.
 * No turn with reduced motion.
 */
export const spin =
  (spinning: () => boolean): Attachment<Element> =>
  element => {
    let turn: Animation | undefined;

    $effect(() => {
      if (spinning()) {
        if (!turn && !prefersReducedMotion()) {
          turn = element.animate(SPIN, { duration: SPIN_MS, iterations: Infinity });
        }
        return;
      }
      if (!turn) return;
      const from = angleOf(getComputedStyle(element).transform);
      turn.cancel();
      turn = undefined;
      const to = Math.ceil(from / 90) * 90;
      if (to - from < 0.5) return;
      element.animate([{ transform: `rotate(${from}deg)` }, { transform: `rotate(${to}deg)` }], {
        duration: (SETTLE_MS * (to - from)) / 90,
        easing: 'ease-out',
      });
    });

    return () => turn?.cancel();
  };
