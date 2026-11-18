// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { insertAt, packGrid, placedIndexAt } from '../grid-pack.presenter.ts';

const L = { columns: 4, rows: 4 };
const M = { columns: 4, rows: 2 };
const S = { columns: 2, rows: 2 };
const XS = { columns: 2, rows: 1 };
const grid = { left: 0, top: 0, width: 1104, columns: 8, rowHeight: 98, gap: 16 };

describe('packGrid', () => {
  it('places the default layout as `row dense` does', () => {
    const placed = packGrid([L, M, M, L, S, S, M, M, XS, XS, XS, XS], 8);
    expect(placed.map(item => [item.column, item.row])).toEqual([
      [0, 0], [4, 0], [4, 2], [0, 4], [4, 4], [6, 4], [4, 6], [0, 8], [4, 8], [6, 8], [4, 9], [6, 9],
    ]);
  });

  it('fills a hole with a later small span, and gives a full row to a span wider than the grid', () => {
    expect(packGrid([S, M, XS], 8).map(item => [item.column, item.row])).toEqual([[0, 0], [2, 0], [6, 0]]);
    expect(packGrid([M, S], 2)).toEqual([
      { columns: 2, rows: 2, column: 0, row: 0 },
      { columns: 2, rows: 2, column: 0, row: 2 },
    ]);
  });
});

describe('placedIndexAt', () => {
  const placed = packGrid([L, M, M, S, S], 8);

  it('takes the whole cell, edges and corners included', () => {
    expect(placedIndexAt(10, 10, placed, grid)).toBe(0);
    expect(placedIndexAt(543, 439, placed, grid)).toBe(0);
    expect(placedIndexAt(1100, 210, placed, grid)).toBe(1);
    expect(placedIndexAt(561, 229, placed, grid)).toBe(2);
    expect(placedIndexAt(5, 460, placed, grid)).toBe(3);
  });

  it('gives a gap to the nearest span, and nothing far out of the grid', () => {
    expect(placedIndexAt(552, 100, placed, grid)).toBe(0);
    expect(placedIndexAt(2000, 100, placed, grid)).toBeNull();
  });
});

describe('insertAt', () => {
  it('inserts, and puts an index out of range at the end', () => {
    expect(insertAt(['a', 'b'], 'x', 1)).toEqual(['a', 'x', 'b']);
    expect(insertAt(['a', 'b'], 'x', 9)).toEqual(['a', 'b', 'x']);
  });
});
