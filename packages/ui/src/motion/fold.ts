import { cubicIn, cubicOut } from 'svelte/easing';
import { slide, type TransitionConfig } from 'svelte/transition';
import { motionDuration } from './reduced-motion.ts';

export const UNFOLD_MS = 220;
export const FOLD_MS = 150;

interface ColumnGap {
  side: 'margin-top' | 'margin-bottom';
  size: number;
  /** The margin of the part on that side. */
  margin: number;
}

/**
 * The gap of the flex column around the part, before it when it is the last child, else after
 * it. The move takes it in too, so the parts around do not jump when the part comes or goes.
 */
const columnGapOf = (node: Element): ColumnGap | null => {
  const parent = node.parentElement;
  if (!parent || parent.childElementCount < 2) return null;
  const column = getComputedStyle(parent);
  if (!column.display.endsWith('flex') || !column.flexDirection.startsWith('column')) return null;
  const size = parseFloat(column.rowGap);
  if (!(size > 0)) return null;
  const own = getComputedStyle(node);
  return parent.lastElementChild === node
    ? { side: 'margin-top', size, margin: parseFloat(own.marginTop) || 0 }
    : { side: 'margin-bottom', size, margin: parseFloat(own.marginBottom) || 0 };
};

/** The height, the paddings, the margins and the gap of `slide`, with a fade over the whole move. */
const heightAndFade = (node: Element, duration: number, easing: (t: number) => number) => {
  const move = slide(node, { duration: motionDuration(duration), easing });
  const gap = columnGapOf(node);
  return {
    ...move,
    css: (t: number, u: number) =>
      `${move.css?.(t, u) ?? ''}; opacity: ${t}` +
      (gap ? `; ${gap.side}: ${gap.margin * t - gap.size * u}px` : ''),
  };
};

/** A part that opens under its owner: it grows to its height and fades in. */
export const unfold = (node: Element): TransitionConfig => heightAndFade(node, UNFOLD_MS, cubicOut);

/** A part that closes: shorter than `unfold`, so the close does not hold the page. */
export const fold = (node: Element): TransitionConfig => heightAndFade(node, FOLD_MS, cubicIn);
