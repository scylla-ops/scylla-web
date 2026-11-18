import type { LayoutSize } from '@base/features/dashboard/domain/structs/dashboard-layout.struct.ts';
import {
  SIZE_CELLS,
  SIZE_ORDER,
} from '@base/features/dashboard/presentation/presenters/widget-catalog.presenter.ts';

const COLUMNS = 8;
const GAP_PX = 16;
const ROW_PX = 98;
/** A box may pass the drawn rectangle by this much and still fit. */
export const RESIZE_TOLERANCE = 0.05;

/** The box in px of a size on a grid `gridWidth` px wide. */
export const sizeBox = (size: LayoutSize, gridWidth: number): { width: number; height: number } => {
  const column = (gridWidth - GAP_PX * (COLUMNS - 1)) / COLUMNS;
  const cells = SIZE_CELLS[size];
  return {
    width: cells.columns * column + (cells.columns - 1) * GAP_PX,
    height: cells.rows * ROW_PX + (cells.rows - 1) * GAP_PX,
  };
};

/**
 * The size of a widget drawn to `width` × `height` px from its top left corner: the largest size
 * it can show whose box fits in the drawing, give or take `RESIZE_TOLERANCE`. When none fits, its
 * smallest size. It never rounds up to a size that the drawing does not cover.
 */
export const sizeAt = (
  width: number,
  height: number,
  gridWidth: number,
  sizes: readonly LayoutSize[],
): LayoutSize => {
  const allowed = SIZE_ORDER.filter(size => sizes.includes(size));
  const fits = allowed.filter(size => {
    const box = sizeBox(size, gridWidth);
    return box.width <= width * (1 + RESIZE_TOLERANCE) && box.height <= height * (1 + RESIZE_TOLERANCE);
  });
  return fits.at(-1) ?? allowed[0] ?? 'm';
};
