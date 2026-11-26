/** The place of the "+N" chip before it shows, to measure the chips around it. */
export const MORE_CHIP_PX = 44;

interface ChipLine {
  /** The widths of the chips, in their order. */
  widths: readonly number[];
  /** The width of the line. */
  available: number;
  /** The space between two chips. */
  gap: number;
  /** The width of the "+N" chip. */
  more: number;
  /** The projects of the section: the ones with no chip go in "+N". */
  total: number;
}

/**
 * How many chips of a folded section fit on its one line: the first chips in their order, then
 * "+N" for the other projects. A chip goes only when "+N" still fits after it.
 */
export const chipsThatFit = ({ widths, available, gap, more, total }: ChipLine): number => {
  let used = 0;
  for (const [index, width] of widths.entries()) {
    const next = used + (index > 0 ? gap : 0) + width;
    const reserve = total > index + 1 ? gap + more : 0;
    if (next + reserve > available) return index;
    used = next;
  }
  return widths.length;
};
