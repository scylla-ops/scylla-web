import type { AnimationConfig } from 'svelte/animate';
import { cubicOut } from 'svelte/easing';
import { prefersReducedMotion } from './reduced-motion.ts';

/** The time that an item takes to go to its new place in a list or a grid. */
export const REFLOW_MS = 200;

export interface ReflowParams {
  /** The item does not slide: a dragged item follows the pointer. */
  still?: boolean;
}

/**
 * An `animate:` function: the item slides from its old place to its new one. It only moves: an
 * item that changes size does not stretch on the way. No motion with reduced motion.
 */
export const reflow = (
  _node: Element,
  { from, to }: { from: DOMRect; to: DOMRect },
  { still = false }: ReflowParams = {},
): AnimationConfig => {
  const dx = from.left - to.left;
  const dy = from.top - to.top;
  return {
    duration: still || prefersReducedMotion() || (dx === 0 && dy === 0) ? 0 : REFLOW_MS,
    easing: cubicOut,
    css: (_t, u) => `transform: translate(${u * dx}px, ${u * dy}px)`,
  };
};
