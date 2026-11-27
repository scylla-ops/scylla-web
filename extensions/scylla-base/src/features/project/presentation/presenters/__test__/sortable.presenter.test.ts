// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  cellAfter,
  draggedBox,
  edgeScroll,
  liftedStyle,
  nearestCell,
} from '../sortable.presenter.ts';

const box = (left: number, top: number) => ({ left, top, width: 100, height: 50 });

describe('the geometry of a sortable drag', () => {
  it('keeps the point where the person took the item under the pointer', () => {
    expect(draggedBox({ x: 300, y: 200 }, { x: 90, y: 10 }, { width: 100, height: 50 })).toEqual(
      box(210, 190),
    );
  });

  it('gives the cell with the nearest center, the first on a tie, and -1 with no cell', () => {
    const cells = [box(0, 0), box(110, 0), box(0, 60)];

    expect(nearestCell(cells, { x: 150, y: 20 })).toBe(1);
    expect(nearestCell(cells, { x: 40, y: 80 })).toBe(2);
    expect(nearestCell(cells, { x: 105, y: 25 })).toBe(0);
    expect(nearestCell([], { x: 0, y: 0 })).toBe(-1);
  });

  it('gives the free cell after the last one, in its row or at the start of the next row', () => {
    expect(cellAfter([box(0, 0), box(110, 0)], 3, 10)).toEqual(box(220, 0));
    expect(cellAfter([box(0, 0), box(110, 0), box(220, 0)], 3, 10)).toEqual(box(0, 60));
    expect(cellAfter([box(0, 0)], 1, 10)).toEqual(box(0, 60));
    expect(cellAfter([], 3, 10)).toBeNull();
  });

  it('scrolls near the edges, faster near the edge, and not in the middle', () => {
    expect(edgeScroll(400, 0, 800)).toBe(0);
    expect(edgeScroll(60, 0, 800)).toBeLessThan(0);
    expect(edgeScroll(0, 0, 800)).toBeLessThan(edgeScroll(60, 0, 800));
    expect(edgeScroll(790, 0, 800)).toBeGreaterThan(0);
    expect(edgeScroll(-50, 0, 800)).toBe(edgeScroll(0, 0, 800));
  });

  it('lifts the item over the page, then lets it settle with a transition', () => {
    const lifted = liftedStyle(box(10, 20), { x: 5, y: -5 }, 'follow');

    expect(lifted).toContain('position: fixed');
    expect(lifted).toContain('translate(5px, -5px) scale(1.02)');
    expect(lifted).not.toContain('transition');
    expect(liftedStyle(box(10, 20), { x: 0, y: 0 }, 'settle')).toContain('transition: transform');
    expect(liftedStyle(box(10, 20), { x: 0, y: 0 }, 'vanish')).toContain('opacity: 0');
  });
});
