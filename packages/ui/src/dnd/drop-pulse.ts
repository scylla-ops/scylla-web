import { prefersReducedMotion } from '../motion/reduced-motion.ts';

/** The time of the pulse of a place that took a drop. */
export const DROP_PULSE_MS = 450;

/**
 * The place that took a drop pulses once: a ring of the primary color grows from its edge and
 * fades. It takes no room and moves nothing. Nothing with a reduced motion.
 */
export const pulseDrop = (element: Element | null | undefined): void => {
  if (!element || prefersReducedMotion() || typeof element.animate !== 'function') return;
  element.animate(
    [
      { boxShadow: '0 0 0 0 color-mix(in oklab, var(--primary) 45%, transparent)' },
      { boxShadow: '0 0 0 10px color-mix(in oklab, var(--primary) 0%, transparent)' },
    ],
    { duration: DROP_PULSE_MS, easing: 'cubic-bezier(0.2, 0, 0, 1)' },
  );
};
