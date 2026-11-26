import { cubicIn, cubicOut } from 'svelte/easing';
import type { TransitionConfig } from 'svelte/transition';
import { motionDuration } from './reduced-motion.ts';

export const ENTER_MS = 200;
export const EXIT_MS = 150;
/** Enough to read as an arrival, too little to read as a slide. */
export const RISE_PX = 4;

/** `cubicOut` as a CSS easing, for the Web Animations API. */
export const ENTER_EASING = 'cubic-bezier(0.33, 1, 0.68, 1)';

/**
 * A part that appears in its place: a message, a banner, an empty state, the content that
 * replaces a skeleton. It fades in and rises a little. It does not change the layout: give it a
 * place that does not move the parts around it, or use `unfold`.
 */
export const enter = (_node?: Element): TransitionConfig => ({
  duration: motionDuration(ENTER_MS),
  easing: cubicOut,
  css: (t, u) => `opacity: ${t}; transform: translateY(${RISE_PX * u}px)`,
});

/** A part that goes away from a place out of the flow (an overlay, a floating bar): a short fade. */
export const exit = (_node?: Element): TransitionConfig => ({
  duration: motionDuration(EXIT_MS),
  easing: cubicIn,
  css: t => `opacity: ${t}`,
});
