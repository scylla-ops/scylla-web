import type { LayoutSize } from '@base/features/dashboard/domain/structs/dashboard-layout.struct.ts';
import {
  SIZE_CELLS,
  SIZE_ORDER,
} from '@base/features/dashboard/presentation/presenters/widget-catalog.presenter.ts';

const COLUMNS = 8;
const GAP_PX = 16;
const ROW_PX = 98;
/** The part of the box of a size that the drawn rectangle must cover for the size to win. */
export const RESIZE_COVERAGE = 0.75;

/** The box in px of a size on a grid `gridWidth` px wide. */
export const sizeBox = (size: LayoutSize, gridWidth: number): { width: number; height: number } => {
  const column = (gridWidth - GAP_PX * (COLUMNS - 1)) / COLUMNS;
  const cells = SIZE_CELLS[size];
  return {
    width: cells.columns * column + (cells.columns - 1) * GAP_PX,
    height: cells.rows * ROW_PX + (cells.rows - 1) * GAP_PX,
  };
};

/** The part of the box of `size` that a rectangle drawn from the same top left corner covers. */
export const coverageOf = (
  size: LayoutSize,
  width: number,
  height: number,
  gridWidth: number,
): number => {
  const box = sizeBox(size, gridWidth);
  return (Math.min(width, box.width) * Math.min(height, box.height)) / (box.width * box.height);
};

/**
 * The size of a widget drawn to `width` × `height` px from its top left corner: the largest size
 * it can show whose box the drawing covers by `RESIZE_COVERAGE` at least. When none is covered,
 * its smallest size.
 */
export const sizeAt = (
  width: number,
  height: number,
  gridWidth: number,
  sizes: readonly LayoutSize[],
): LayoutSize => {
  const allowed = SIZE_ORDER.filter(size => sizes.includes(size));
  const covered = allowed.filter(size => coverageOf(size, width, height, gridWidth) >= RESIZE_COVERAGE);
  return covered.at(-1) ?? allowed[0] ?? 'm';
};
