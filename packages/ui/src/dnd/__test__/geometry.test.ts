// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { distanceTo, edgeScroll, insertIndex, layoutBox, zoneAt, type Box } from '../geometry.ts';

const box = (left: number, top: number, width: number, height: number): Box => ({
  left,
  top,
  width,
  height,
});

// Three sections one under the other, each 200 px high, with no gap.
const zones = [
  { key: 'pins', box: box(0, 0, 1000, 200) },
  { key: 'deploys', box: box(0, 200, 1000, 200) },
  { key: 'ungrouped', box: box(0, 400, 1000, 200) },
];

describe('zoneAt', () => {
  it('takes the zone under the pointer, over its whole box', () => {
    expect(zoneAt(zones, { x: 500, y: 10 })).toBe('pins');
    expect(zoneAt(zones, { x: 990, y: 199 })).toBe('pins');
    expect(zoneAt(zones, { x: 10, y: 250 })).toBe('deploys');
  });

  it('takes a drop in a margin of 24 px around a zone, and none farther', () => {
    expect(zoneAt(zones, { x: 500, y: -20 })).toBe('pins');
    expect(zoneAt(zones, { x: 1020, y: 450 })).toBe('ungrouped');
    expect(zoneAt(zones, { x: 500, y: -30 })).toBeNull();
  });

  it('gives the zone under the pointer at once, also from the zone of the drag next to it', () => {
    expect(zoneAt(zones, { x: 500, y: 195 }, { current: 'deploys' })).toBe('pins');
    expect(zoneAt(zones, { x: 500, y: 205 }, { current: 'pins' })).toBe('deploys');
  });

  it('keeps the current zone in its whole margin, else gives the nearest zone', () => {
    const apart = [
      { key: 'a', box: box(0, 0, 100, 100) },
      { key: 'b', box: box(0, 130, 100, 100) },
    ];
    expect(zoneAt(apart, { x: 50, y: 120 })).toBe('b');
    expect(zoneAt(apart, { x: 50, y: 120 }, { current: 'a' })).toBe('a');
  });

  it('gives the smallest of two boxes that hold the pointer', () => {
    const nested = [
      { key: 'page', box: box(0, 0, 1000, 1000) },
      { key: 'zone', box: box(100, 100, 200, 40) },
    ];
    expect(zoneAt(nested, { x: 150, y: 120 })).toBe('zone');
  });
});

describe('insertIndex', () => {
  // A list of three rows, 50 px high.
  const rows = [box(0, 0, 300, 50), box(0, 50, 300, 50), box(0, 100, 300, 50)];

  it('puts the item before the first row whose middle is under the pointer', () => {
    expect(insertIndex(rows, { x: 10, y: 10 })).toBe(0);
    expect(insertIndex(rows, { x: 10, y: 30 })).toBe(1);
    expect(insertIndex(rows, { x: 10, y: 140 })).toBe(3);
    expect(insertIndex([], { x: 10, y: 140 })).toBe(0);
  });

  it('changes the order back only a quarter of an item past the middle', () => {
    // The slot is before the second row: the pointer passes it at 75 + 12.5.
    expect(insertIndex(rows, { x: 10, y: 85 }, { current: 1 })).toBe(1);
    expect(insertIndex(rows, { x: 10, y: 90 }, { current: 1 })).toBe(2);
    // Now after it: it comes back only at 75 - 12.5.
    expect(insertIndex(rows, { x: 10, y: 65 }, { current: 2 })).toBe(2);
    expect(insertIndex(rows, { x: 10, y: 60 }, { current: 2 })).toBe(1);
  });

  // A grid of 3 columns, cards of 100 × 80 px, 20 px apart; the last row has one card.
  const cards = [
    box(0, 0, 100, 80),
    box(120, 0, 100, 80),
    box(240, 0, 100, 80),
    box(0, 100, 100, 80),
  ];

  it('finds the row of the pointer first in a grid, then the middle of a card in that row', () => {
    expect(insertIndex(cards, { x: 130, y: 40 }, { columns: 3 })).toBe(1);
    expect(insertIndex(cards, { x: 200, y: 40 }, { columns: 3 })).toBe(2);
    expect(insertIndex(cards, { x: 330, y: 40 }, { columns: 3 })).toBe(3);
    expect(insertIndex(cards, { x: 30, y: 140 }, { columns: 3 })).toBe(3);
    expect(insertIndex(cards, { x: 200, y: 140 }, { columns: 3 })).toBe(4);
    // The gap between two rows goes half to each.
    expect(insertIndex(cards, { x: 200, y: 89 }, { columns: 3 })).toBe(2);
    expect(insertIndex(cards, { x: 200, y: 91 }, { columns: 3 })).toBe(4);
  });

  it('takes the first row above the grid, and the last row below it', () => {
    expect(insertIndex(cards, { x: 10, y: -40 }, { columns: 3 })).toBe(0);
    expect(insertIndex(cards, { x: 300, y: 400 }, { columns: 3 })).toBe(4);
  });
});

describe('distanceTo and edgeScroll', () => {
  it('measures 0 in a box, and the shortest way to it out of the box', () => {
    expect(distanceTo(box(0, 0, 10, 10), { x: 5, y: 5 })).toBe(0);
    expect(distanceTo(box(0, 0, 10, 10), { x: 13, y: 14 })).toBe(5);
  });

  it('scrolls near the edges, faster near the edge, and not in the middle', () => {
    expect(edgeScroll(500, 0, 1000)).toBe(0);
    expect(edgeScroll(60, 0, 1000)).toBeLessThan(0);
    expect(edgeScroll(0, 0, 1000)).toBe(-18);
    expect(edgeScroll(1000, 0, 1000)).toBe(18);
    expect(edgeScroll(990, 0, 1000)).toBeGreaterThan(edgeScroll(950, 0, 1000));
  });
});

describe('layoutBox', () => {
  /** An element placed at (10, 20) in its positioned parent, which has a border of 1 px. */
  const placed = (parent: unknown) =>
    ({
      offsetParent: parent,
      offsetLeft: 10,
      offsetTop: 20,
      offsetWidth: 300,
      offsetHeight: 160,
      getBoundingClientRect: () => box(999, 999, 1, 1),
    }) as unknown as HTMLElement;

  it('measures from the positioned parent of the element, with no transform', () => {
    const section = {
      clientLeft: 1,
      clientTop: 1,
      getBoundingClientRect: () => box(100, 400, 1000, 600),
    };

    expect(layoutBox(placed(section))).toEqual(box(111, 421, 300, 160));
  });

  it('gives the box on the screen of an element out of the layout', () => {
    expect(layoutBox(placed(null))).toEqual(box(999, 999, 1, 1));
  });
});
