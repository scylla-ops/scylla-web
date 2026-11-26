/**
 * The geometry of a sortable drag: the item follows the pointer, and the slot goes to the cell
 * that the item covers most. Nothing here knows a card or a section: a list of sections can use it.
 */

/** A point of the viewport, in px. */
export interface Point {
  x: number;
  y: number;
}

/** A box of the viewport, in px. */
export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** The time that a dropped item takes to go into its slot. */
export const SETTLE_MS = 200;

const EDGE_PX = 64;
const MAX_SCROLL_PX = 18;

export const centerOf = (box: Box): Point => ({
  x: box.left + box.width / 2,
  y: box.top + box.height / 2,
});

/**
 * The box of the dragged item: the point where the person took it stays under the pointer.
 * `grab` is this point, from the top left corner of the item.
 */
export const draggedBox = (
  pointer: Point,
  grab: Point,
  size: Pick<Box, 'width' | 'height'>,
): Box => ({
  left: pointer.x - grab.x,
  top: pointer.y - grab.y,
  width: size.width,
  height: size.height,
});

/**
 * The cell with the center nearest to a point, or -1 with no cell. Give it the center of the
 * dragged item, and the slot as one of the cells: the slot then takes the place of a neighbor when
 * the item covers more than half of it. The point where the person took the item does not count,
 * and a gap between two cells goes half to each.
 */
export const nearestCell = (cells: readonly Box[], point: Point): number => {
  let nearest = -1;
  let shortest = Infinity;
  cells.forEach((cell, index) => {
    const center = centerOf(cell);
    const distance = Math.hypot(center.x - point.x, center.y - point.y);
    if (distance < shortest) {
      shortest = distance;
      nearest = index;
    }
  });
  return nearest;
};

/**
 * The free cell after the last cell of a grid that fills its rows from the left: a drop there puts
 * the item last. `columns` and `gap` are those of the grid. Null with no cell.
 */
export const cellAfter = (cells: readonly Box[], columns: number, gap: number): Box | null => {
  const last = cells.at(-1);
  if (!last) return null;
  const column = (cells.length - 1) % Math.max(columns, 1);
  return column + 1 < columns
    ? { ...last, left: last.left + last.width + gap }
    : { ...last, left: cells[0].left, top: last.top + last.height + gap };
};

/**
 * The scroll of a frame while the pointer is near the top or the bottom of the scroller, faster
 * near the edge: negative goes up. 0 out of the edges.
 */
export const edgeScroll = (y: number, top: number, bottom: number): number => {
  const speed = (depth: number) => Math.ceil(MAX_SCROLL_PX * Math.min(depth / EDGE_PX, 1));
  if (y < top + EDGE_PX) return -speed(top + EDGE_PX - y);
  if (y > bottom - EDGE_PX) return speed(y - (bottom - EDGE_PX));
  return 0;
};

/** How the dragged item moves: it follows the pointer, settles in its slot, or vanishes. */
export type LiftedMotion = 'follow' | 'settle' | 'vanish';

const SCALE: Record<LiftedMotion, string> = {
  follow: ' scale(1.02)',
  settle: '',
  vanish: ' scale(0.3)',
};

/**
 * The style of the dragged item: it leaves the flow and stays over the page at its box, moved by
 * `offset`. It settles in `SETTLE_MS`; when it vanishes (a drop in a closed section), it also
 * shrinks and fades.
 */
export const liftedStyle = (box: Box, offset: Point, motion: LiftedMotion): string =>
  [
    'position: fixed',
    'z-index: 50',
    `left: ${box.left}px`,
    `top: ${box.top}px`,
    `width: ${box.width}px`,
    `height: ${box.height}px`,
    `transform: translate(${offset.x}px, ${offset.y}px)${SCALE[motion]}`,
    motion === 'vanish' ? 'transform-origin: left center; opacity: 0' : '',
    motion === 'follow'
      ? ''
      : `transition: transform ${SETTLE_MS}ms cubic-bezier(0.2, 0, 0, 1), opacity ${SETTLE_MS}ms`,
  ]
    .filter(Boolean)
    .join('; ');
