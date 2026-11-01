import type { Attachment } from 'svelte/attachments';

/**
 * Fits the view again each time the canvas changes size, while the user has not moved it. The
 * panes get their sizes after the first fit (their layout, then its transition), so a single fit
 * frames the nodes in a canvas that is still narrow.
 */
export const keepFitted =
  (options: () => { fitted: boolean; fit: () => void }): Attachment<HTMLElement> =>
  node => {
    const observer = new ResizeObserver(() => {
      // Read at call time: the user may have moved the view since.
      const { fitted, fit } = options();
      if (fitted) fit();
    });
    observer.observe(node);
    return () => observer.disconnect();
  };
