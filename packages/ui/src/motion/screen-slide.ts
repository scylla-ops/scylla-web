import { cubicOut } from 'svelte/easing';
import type { TransitionConfig } from 'svelte/transition';
import { motionDuration } from './reduced-motion.ts';

/** The two screens move together: the second one comes in while the first one goes back. */
export const SCREEN_MS = 220;

/**
 * The first screen, which stays in its place under the second one: it moves a quarter of its
 * width to the start and fades, in `SCREEN_MS` with the easing of `cubicOut`, and comes back
 * the same way. A CSS transition, because the screen stays: what it holds (a form) is kept.
 */
export const SCREEN_BEHIND_CLASS =
  'transition-[translate,opacity] duration-220 ease-[cubic-bezier(0.33,1,0.68,1)] motion-reduce:transition-none';

/** The first screen while the second one shows. */
export const SCREEN_AWAY_CLASS = '-translate-x-1/4 opacity-0';

/** The second screen comes from the end side, over the full width of its box, and fades in. */
export const screenIn = (_node?: Element): TransitionConfig => ({
  duration: motionDuration(SCREEN_MS),
  easing: cubicOut,
  css: (t, u) => `opacity: ${t}; transform: translateX(${100 * u}%)`,
});

/** Back: the second screen goes to the end side, as it came. */
export const screenOut = (_node?: Element): TransitionConfig => ({
  duration: motionDuration(SCREEN_MS),
  easing: cubicOut,
  css: (t, u) => `opacity: ${t}; transform: translateX(${100 * u}%)`,
});
