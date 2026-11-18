import type { AnimationConfig } from 'svelte/animate';
import { cubicOut } from 'svelte/easing';
import { prefersReducedMotion } from '@scylla/ui';

/** The time that a widget takes to go to its new place on the grid. */
export const REFLOW_MS = 200;

/**
 * An `animate:` function: the widget slides from its old place to its new one. It only moves:
 * a widget that changes size does not stretch on the way. No motion with reduced motion.
 */
export const reflow = (_node: Element, { from, to }: { from: DOMRect; to: DOMRect }): AnimationConfig => {
  const dx = from.left - to.left;
  const dy = from.top - to.top;
  return {
    duration: prefersReducedMotion() || (dx === 0 && dy === 0) ? 0 : REFLOW_MS,
    easing: cubicOut,
    css: (_t, u) => `transform: translate(${u * dx}px, ${u * dy}px)`,
  };
};
