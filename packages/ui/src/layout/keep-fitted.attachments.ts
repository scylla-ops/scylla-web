import type { Attachment } from 'svelte/attachments';

/**
 * Fits the view again each time the canvas changes size (the window, a drag of the side panel, a
 * change of its mode), while the user has not moved it.
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
