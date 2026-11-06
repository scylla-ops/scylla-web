import type { Attachment } from 'svelte/attachments';

export interface MeasuredHeight {
  /** `null` until the first attach. The last value stays when the element goes away. */
  readonly height: number | null;
  measure: Attachment<HTMLElement>;
}

/**
 * The height the layout gives an element. Put `{@attach measure}` on a container sized
 * by the layout (`flex-1 min-h-0`), never by its content, or the measure feeds back
 * into itself.
 */
export const createMeasuredHeight = (): MeasuredHeight => {
  let height = $state<number | null>(null);

  const measure: Attachment<HTMLElement> = node => {
    height = node.clientHeight;

    const observer = new ResizeObserver(([entry]) => {
      height = entry.contentRect.height;
    });
    observer.observe(node);

    return () => observer.disconnect();
  };

  return {
    get height() {
      return height;
    },
    measure,
  };
};
