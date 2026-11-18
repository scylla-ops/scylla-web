/** The cells that a widget takes on the grid. */
export interface Span {
  columns: number;
  rows: number;
}

/** A widget placed on the grid: its first column and row, from 0. */
export interface Placed extends Span {
  column: number;
  row: number;
}

/** The geometry of the grid in px, as the page draws it. */
export interface GridGeometry {
  left: number;
  top: number;
  width: number;
  columns: number;
  rowHeight: number;
  gap: number;
}

/**
 * The places that CSS gives to the spans with `grid-auto-flow: row dense`: each span takes the
 * first free place, from the top left. A span wider than the grid takes a full row.
 */
export const packGrid = (spans: readonly Span[], columns: number): Placed[] => {
  const used: boolean[][] = [];
  const free = (row: number, column: number, span: Span) => {
    for (let r = row; r < row + span.rows; r += 1) {
      for (let c = column; c < column + span.columns; c += 1) {
        if (used[r]?.[c]) return false;
      }
    }
    return true;
  };
  return spans.map(raw => {
    const span = { columns: Math.min(raw.columns, columns), rows: raw.rows };
    for (let row = 0; ; row += 1) {
      for (let column = 0; column + span.columns <= columns; column += 1) {
        if (!free(row, column, span)) continue;
        for (let r = row; r < row + span.rows; r += 1) {
          used[r] ??= [];
          for (let c = column; c < column + span.columns; c += 1) used[r][c] = true;
        }
        return { ...span, column, row };
      }
    }
  });
};

/**
 * The index of the placed span under the pointer, from the cells: the whole cell counts, the
 * gaps go to the nearest span. `null` out of the grid by more than `margin` px. `keep` stays the
 * answer while the pointer is less than `stickiness` cells away from it: a pointer on a boundary
 * does not swing between two spans.
 */
export const placedIndexAt = (
  x: number,
  y: number,
  placed: readonly Placed[],
  grid: GridGeometry,
  margin = 24,
  keep: number | null = null,
  stickiness = 0.25,
): number | null => {
  if (placed.length === 0) return null;
  const bottom = Math.max(...placed.map(item => item.row + item.rows));
  const columnWidth = (grid.width - grid.gap * (grid.columns - 1)) / grid.columns;
  const height = bottom * grid.rowHeight + (bottom - 1) * grid.gap;
  if (x < grid.left - margin || x > grid.left + grid.width + margin) return null;
  if (y < grid.top - margin || y > grid.top + height + margin) return null;
  const column = (x - grid.left + grid.gap / 2) / (columnWidth + grid.gap);
  const row = (y - grid.top + grid.gap / 2) / (grid.rowHeight + grid.gap);
  const distance = (item: Placed) => {
    const dx = Math.max(item.column - column, 0, column - (item.column + item.columns));
    const dy = Math.max(item.row - row, 0, row - (item.row + item.rows));
    return Math.hypot(dx, dy);
  };
  if (keep !== null && placed[keep] && distance(placed[keep]) <= stickiness) return keep;
  let best = 0;
  placed.forEach((item, index) => {
    if (distance(item) < distance(placed[best])) best = index;
  });
  return best;
};

/** The list with `moved` at `at`. Out of range, `at` puts it at the end. */
export const insertAt = <T>(list: readonly T[], moved: T, at: number): T[] => {
  const index = Math.max(0, Math.min(at, list.length));
  return [...list.slice(0, index), moved, ...list.slice(index)];
};
