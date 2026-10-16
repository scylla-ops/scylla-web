import type { Action } from 'svelte/action';

/** Reports the height of the node at once and on each resize. */
export const trackHeight: Action<HTMLElement, (height: number) => void> = (node, onHeight) => {
  let report = onHeight;
  report?.(node.offsetHeight);

  const observer = new ResizeObserver(() => report?.(node.offsetHeight));
  observer.observe(node);

  return {
    update(next) {
      report = next;
    },
    destroy() {
      observer.disconnect();
    },
  };
};
