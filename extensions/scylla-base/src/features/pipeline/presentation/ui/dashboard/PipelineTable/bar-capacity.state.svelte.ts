import type { Attachment } from 'svelte/attachments';
import {
  MAX_BARS,
  barCapacity,
} from '@base/features/pipeline/presentation/presenters/pipeline-history.presenter.ts';

export interface BarCapacity {
  /** The bars that the History column holds: `MAX_BARS` until the first measure with a layout. */
  readonly count: number;
  /** On the box of the bars of a row. All rows have the width of the column. */
  measure: Attachment<HTMLElement>;
}

/** One count for the bars of each row and for the figures of the stats card. */
export const createBarCapacity = (): BarCapacity => {
  let width = $state<number | null>(null);

  const measure: Attachment<HTMLElement> = node => {
    // A width of 0 is a box with no layout (hidden): it keeps the last count.
    const read = (next: number) => {
      if (next > 0) width = next;
    };
    // Before the first paint: the observer reports a frame later, and the row would show 30 bars.
    read(node.clientWidth);
    const observer = new ResizeObserver(([entry]) => read(entry.contentRect.width));
    observer.observe(node);
    return () => observer.disconnect();
  };

  return {
    get count() {
      return width === null ? MAX_BARS : barCapacity(width);
    },
    measure,
  };
};
