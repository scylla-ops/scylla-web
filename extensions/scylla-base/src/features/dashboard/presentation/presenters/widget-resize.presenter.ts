import type { LayoutSize } from '@base/features/dashboard/domain/structs/dashboard-layout.struct.ts';
import { SIZE_CELLS } from '@base/features/dashboard/presentation/presenters/widget-catalog.presenter.ts';

const COLUMNS = 8;
const GAP_PX = 16;
const ROW_PX = 98;

/**
 * The size that a widget drawn to `width` × `height` px takes, out of the sizes it can show: the
 * size whose cells are the nearest to the cells that the drawing covers.
 */
export const sizeAt = (
  width: number,
  height: number,
  gridWidth: number,
  sizes: readonly LayoutSize[],
): LayoutSize => {
  const column = (gridWidth - GAP_PX * (COLUMNS - 1)) / COLUMNS;
  const columns = Math.max(1, Math.round((width + GAP_PX) / (column + GAP_PX)));
  const rows = Math.max(1, Math.round((height + GAP_PX) / (ROW_PX + GAP_PX)));
  const distance = (size: LayoutSize) =>
    Math.abs(SIZE_CELLS[size].columns - columns) + Math.abs(SIZE_CELLS[size].rows - rows);
  return [...sizes].sort((a, b) => distance(a) - distance(b))[0] ?? 'm';
};
