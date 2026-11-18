/** A box on the screen, in px, as `getBoundingClientRect` gives it. */
export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** The box of a place where a drop can land, and the index that a drop there takes. */
export interface DropSlot extends Box {
  index: number;
}

const contains = (box: Box, x: number, y: number): boolean =>
  x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;

const distance = (box: Box, x: number, y: number): number => {
  const dx = Math.max(box.left - x, 0, x - box.right);
  const dy = Math.max(box.top - y, 0, y - box.bottom);
  return Math.hypot(dx, dy);
};

/**
 * The index where a drag lands for the pointer at `x`, `y`. The whole box of a slot counts: the
 * slot under the pointer wins. In a gap of the grid, the nearest slot wins. Out of `area`, `null`.
 */
export const dropIndexAt = (
  x: number,
  y: number,
  slots: readonly DropSlot[],
  area: Box,
): number | null => {
  if (!contains(area, x, y) || slots.length === 0) return null;
  const under = slots.find(slot => contains(slot, x, y));
  if (under) return under.index;
  return [...slots].sort((a, b) => distance(a, x, y) - distance(b, x, y))[0].index;
};
