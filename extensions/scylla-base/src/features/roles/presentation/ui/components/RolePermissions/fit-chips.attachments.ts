import type { Attachment } from 'svelte/attachments';

/** The number of chips that fit on one line. When some do not fit, the "+N" pill takes its room. */
export const fitCount = (
  widths: readonly number[],
  available: number,
  gap: number,
  more: number,
): number => {
  const all = widths.reduce((sum, width) => sum + width, 0) + gap * (widths.length - 1);
  if (all <= available) return widths.length;
  let used = more;
  let count = 0;
  for (const width of widths) {
    used += width + gap;
    if (used > available) break;
    count += 1;
  }
  return count;
};

/**
 * Measures the copy of the chips in `[data-measure]`, whose last child is the "+N" pill, against
 * the width of the node. Calls `onFit` again when one of the two changes size.
 */
export const fitChips =
  (gap: number, onFit: (count: number) => void): Attachment<HTMLElement> =>
  node => {
    const measure = node.querySelector<HTMLElement>('[data-measure]');
    if (!measure) return;

    const update = () => {
      const widths = [...measure.children].map(child => child.getBoundingClientRect().width);
      const more = widths.pop() ?? 0;
      onFit(fitCount(widths, node.getBoundingClientRect().width, gap, more));
    };
    const observer = new ResizeObserver(update);
    observer.observe(node);
    observer.observe(measure);
    update();

    return () => observer.disconnect();
  };
