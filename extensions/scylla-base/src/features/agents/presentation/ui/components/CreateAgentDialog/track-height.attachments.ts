import type { Attachment } from 'svelte/attachments';

/** Reports the height of the node at once and on each resize. */
export const trackHeight =
  (onHeight: (height: number) => void): Attachment<HTMLElement> =>
  node => {
    onHeight(node.offsetHeight);

    const observer = new ResizeObserver(() => onHeight(node.offsetHeight));
    observer.observe(node);
    return () => observer.disconnect();
  };
