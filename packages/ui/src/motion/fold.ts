import { cubicIn, cubicOut } from 'svelte/easing';
import { slide, type TransitionConfig } from 'svelte/transition';
import { motionDuration } from './reduced-motion.ts';

export const UNFOLD_MS = 220;
export const FOLD_MS = 150;

/** The height, the paddings and the margins of `slide`, with a fade over the whole move. */
const heightAndFade = (node: Element, duration: number, easing: (t: number) => number) => {
  const move = slide(node, { duration: motionDuration(duration), easing });
  return { ...move, css: (t: number, u: number) => `${move.css?.(t, u) ?? ''}; opacity: ${t}` };
};

/** A part that opens under its owner: it grows to its height and fades in. */
export const unfold = (node: Element): TransitionConfig => heightAndFade(node, UNFOLD_MS, cubicOut);

/** A part that closes: shorter than `unfold`, so the close does not hold the page. */
export const fold = (node: Element): TransitionConfig => heightAndFade(node, FOLD_MS, cubicIn);
