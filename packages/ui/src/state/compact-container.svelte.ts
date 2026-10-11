import type { Attachment } from 'svelte/attachments';

const COMPACT_WIDTH_PX = 70;

export interface CompactContainer {
  readonly isCompact: boolean;
  measure: Attachment<HTMLElement>;
}

/**
 * True when an element is too narrow to lay its content out inline, so a row
 * action bar can fall back to a menu. Uses the element's own width, not the viewport's.
 */
export const createCompactContainer = (threshold: number = COMPACT_WIDTH_PX): CompactContainer => {
  let isCompact = $state(false);

  const measure: Attachment<HTMLElement> = node => {
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        isCompact = entry.contentRect.width < threshold;
      }
    });
    observer.observe(node);

    return () => observer.disconnect();
  };

  return {
    get isCompact() {
      return isCompact;
    },
    measure,
  };
};
