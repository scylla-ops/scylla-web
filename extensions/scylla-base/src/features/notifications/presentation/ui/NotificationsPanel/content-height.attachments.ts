import type { Attachment } from 'svelte/attachments';

/**
 * Gives the node the height of its first child, so that a CSS transition on `height` eases each
 * change of the content. The first height is not eased: `auto` does not interpolate.
 */
export const followContentHeight: Attachment<HTMLElement> = node => {
  const content = node.firstElementChild;
  if (!content) return;

  const observer = new ResizeObserver(([entry]) => {
    node.style.height = `${entry.borderBoxSize[0].blockSize}px`;
  });
  observer.observe(content);

  return () => observer.disconnect();
};
