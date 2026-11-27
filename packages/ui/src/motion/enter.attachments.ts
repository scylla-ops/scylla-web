import { ENTER_EASING, ENTER_MS, RISE_PX } from './enter.ts';
import { prefersReducedMotion } from './reduced-motion.ts';

/**
 * Plays `enter` each time the element becomes active (`data-state="active"`), not when it mounts:
 * the content of a tab, which stays in the page while it is hidden.
 */
export const enterOnActivate = (node: HTMLElement) => {
  const observer = new MutationObserver(records => {
    const activated = records.some(record => record.oldValue !== 'active');
    if (node.dataset.state !== 'active' || !activated || prefersReducedMotion()) return;
    node.animate(
      [
        { opacity: 0, transform: `translateY(${RISE_PX}px)` },
        { opacity: 1, transform: 'none' },
      ],
      { duration: ENTER_MS, easing: ENTER_EASING },
    );
  });
  observer.observe(node, { attributeFilter: ['data-state'], attributeOldValue: true });
  return () => observer.disconnect();
};
