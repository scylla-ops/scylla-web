/**
 * The geometry of a drag: where it starts, which zone takes it, where the item goes in a zone, and
 * the scroll at the edges. Plain TypeScript: nothing here knows the DOM of a page.
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

/** A mouse or a pen moves this far with the button down before a drag: a click stays a click. */
export const DRAG_SLOP_PX = 5;
/** A finger holds still this long before a drag. A move before it scrolls the page. */
export const TOUCH_HOLD_MS = 250;
/** A finger that moves more than this during the hold scrolls the page: no drag. */
export const TOUCH_SLOP_PX = 8;
/** The room around a zone that still takes the drop. */
export const ZONE_MARGIN_PX = 24;
/**
 * Past the middle of an item, the pointer goes this part of the item further before the order
 * changes back: a pointer near a middle does not swing the slot.
 */
export const INSERT_HYSTERESIS = 0.25;

const EDGE_PX = 64;
const MAX_SCROLL_PX = 18;

export const boxOf = ({ left, top, width, height }: Box): Box => ({ left, top, width, height });

/**
 * The box of an element where its positioned parent (`offsetParent`) places it. A transform does
 * not move it: the slide of a reflow does not change the place of an item while it moves. An
 * element out of the layout (no `offsetParent`) gives its box on the screen.
 */
export const layoutBox = (element: HTMLElement): Box => {
  const parent = element.offsetParent;
  if (!parent) return boxOf(element.getBoundingClientRect());
  const { left, top } = parent.getBoundingClientRect();
  return {
    left: left + parent.clientLeft + element.offsetLeft,
    top: top + parent.clientTop + element.offsetTop,
    width: element.offsetWidth,
    height: element.offsetHeight,
  };
};

export const centerOf = (box: Box): Point => ({
  x: box.left + box.width / 2,
  y: box.top + box.height / 2,
});

export const contains = (box: Box, point: Point): boolean =>
  point.x >= box.left &&
  point.x <= box.left + box.width &&
  point.y >= box.top &&
  point.y <= box.top + box.height;

/** How far a point is from a box: 0 in the box. */
export const distanceTo = (box: Box, point: Point): number => {
  const dx = Math.max(box.left - point.x, 0, point.x - (box.left + box.width));
  const dy = Math.max(box.top - point.y, 0, point.y - (box.top + box.height));
  return Math.hypot(dx, dy);
};

/** A place that takes a drop, as the drag measures it. */
export interface Zone<K> {
  key: K;
  box: Box;
}

export interface ZoneOptions<K> {
  /** The room around each zone that still takes the drop. */
  margin?: number;
  /** The zone of the drag now: it keeps the pointer in its margin, out of each other box. */
  current?: K | null;
}

/**
 * The zone under the pointer: the pointer decides, never the edges or the center of the dragged
 * item. A zone takes the pointer over its whole box and `margin` px around it. A box that holds the
 * pointer wins over a margin, the smallest when boxes overlap; between two margins, the nearest box
 * wins. The current zone keeps the pointer in its whole margin, but a box that holds the pointer
 * takes it at once: the pointer over a zone always drops there. Null out of each zone and its
 * margin.
 */
export const zoneAt = <K>(
  zones: readonly Zone<K>[],
  point: Point,
  { margin = ZONE_MARGIN_PX, current = null }: ZoneOptions<K> = {},
): K | null => {
  const kept = zones.find(zone => zone.key === current);
  const keptDistance = kept ? distanceTo(kept.box, point) : Infinity;
  const inside = zones.filter(zone => contains(zone.box, point));
  if (inside.length > 0) {
    const area = (zone: Zone<K>) => zone.box.width * zone.box.height;
    return inside.reduce((best, zone) => (area(zone) < area(best) ? zone : best)).key;
  }
  if (kept && keptDistance <= margin) return kept.key;
  const near = zones
    .map(zone => ({ zone, distance: distanceTo(zone.box, point) }))
    .filter(({ distance }) => distance <= margin);
  if (near.length === 0) return null;
  return near.reduce((best, item) => (item.distance < best.distance ? item : best)).zone.key;
};

export interface InsertOptions {
  /** The place of the slot now, from 0: the order changes back only past the hysteresis. */
  current?: number | null;
  /** The columns of the grid. With 1, a list: the height decides. */
  columns?: number;
  hysteresis?: number;
}

/** The items of a grid in rows: the items of a row have the same top. */
const rowsOf = (items: readonly Box[]): number[][] => {
  const rows: number[][] = [];
  items.forEach((box, index) => {
    const row = rows.at(-1);
    const first = row ? items[row[0]] : undefined;
    if (row && first && Math.abs(box.top - first.top) < first.height / 2) row.push(index);
    else rows.push([index]);
  });
  return rows;
};

/**
 * Where the dragged item goes among `items`, the boxes of the other items in their order: the index
 * of the first item that the pointer is before, or `items.length` after the last one. In a list, the
 * pointer compares with the middle of each item; in a grid, the row of the pointer decides first,
 * then the middle of each item in that row. Past a middle, the pointer must go `hysteresis` of the
 * item further before the order changes back.
 */
export const insertIndex = (
  items: readonly Box[],
  point: Point,
  { current = null, columns = 1, hysteresis = INSERT_HYSTERESIS }: InsertOptions = {},
): number => {
  if (items.length === 0) return 0;
  // An item after the slot needs more than its middle to pass; an item before it, less to come back.
  const middle = (index: number) =>
    0.5 + (current === null ? 0 : index >= current ? hysteresis : -hysteresis);
  const pastY = (box: Box, index: number) => point.y > box.top + box.height * middle(index);
  const pastX = (box: Box, index: number) => point.x > box.left + box.width * middle(index);
  if (columns <= 1) {
    const at = items.findIndex((box, index) => !pastY(box, index));
    return at < 0 ? items.length : at;
  }
  const rows = rowsOf(items);
  const bottomOf = (row: number[]) =>
    Math.max(...row.map(index => items[index].top + items[index].height));
  const topOf = (row: number[]) => Math.min(...row.map(index => items[index].top));
  // The gap between two rows goes half to each.
  const row =
    rows.find((cells, index) => {
      const next = rows[index + 1];
      return !next || point.y < (bottomOf(cells) + topOf(next)) / 2;
    }) ?? rows[rows.length - 1];
  const at = row.find(index => !pastX(items[index], index));
  return at ?? row[row.length - 1] + 1;
};

/**
 * The scroll of one frame while the pointer is near the top or the bottom of the scroller, faster
 * near the edge: negative goes up. 0 out of the edges.
 */
export const edgeScroll = (y: number, top: number, bottom: number): number => {
  const speed = (depth: number) => Math.ceil(MAX_SCROLL_PX * Math.min(depth / EDGE_PX, 1));
  if (y < top + EDGE_PX) return -speed(top + EDGE_PX - y);
  if (y > bottom - EDGE_PX) return speed(y - (bottom - EDGE_PX));
  return 0;
};
