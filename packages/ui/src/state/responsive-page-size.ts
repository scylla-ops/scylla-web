export const MIN_PAGE_SIZE = 5;
export const MAX_PAGE_SIZE = 50;
/** A row of `DataTable`: 56 px, and the 2 px gap to the next one. */
export const DEFAULT_ROW_HEIGHT = 58;
/** The frame of `DataTable` above and below its rows: the borders, the 6 px margins, the header and its gap. */
export const DEFAULT_HEADER_HEIGHT = 48;

/** How many rows fit in the height, clamped. The measure is in `measured-height.state.svelte.ts`. */
export const computePageSize = (
  containerHeight: number,
  rowHeight: number = DEFAULT_ROW_HEIGHT,
  headerHeight: number = DEFAULT_HEADER_HEIGHT,
): number => {
  const rows = Math.floor((containerHeight - headerHeight) / rowHeight);
  return Math.min(MAX_PAGE_SIZE, Math.max(MIN_PAGE_SIZE, rows));
};
