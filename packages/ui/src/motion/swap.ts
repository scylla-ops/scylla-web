import { cubicIn } from 'svelte/easing';
import type { TransitionConfig } from 'svelte/transition';
import { motionDuration } from './reduced-motion.ts';
import { springEasing } from './spring.ts';

export const SWAP_IN = { bounce: 0.2, duration: 240 };
export const SWAP_OUT_MS = 120;

const swapEasing = springEasing(SWAP_IN);

/**
 * A new value that takes the place of the old one, for example an icon after a change of glyph,
 * color or image: it grows a little and fades in, while the old one fades out on top of it. The
 * two are in the same grid cell, so the size of the place does not change.
 */
export const swapIn = (_node?: Element): TransitionConfig => ({
  duration: motionDuration(SWAP_IN.duration),
  css: t => `opacity: ${Math.min(1, t * 2)}; transform: scale(${0.85 + 0.15 * swapEasing(t)})`,
});

export const swapOut = (_node?: Element): TransitionConfig => ({
  duration: motionDuration(SWAP_OUT_MS),
  easing: cubicIn,
  css: (t, u) => `opacity: ${t}; transform: scale(${1 + 0.06 * u})`,
});
