// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  isEmptyLayout,
  mergeLayouts,
  toNodePlace,
  withinLimit,
} from '../pipeline-layout.struct.ts';

describe('toNodePlace', () => {
  it('gives whole pixels, because the server keeps whole numbers', () => {
    expect(toNodePlace({ x: 10.4, y: -3.6 })).toEqual({ x: 10, y: -4 });
  });

  it('stays on the canvas, or the server refuses all the places of the request', () => {
    expect(toNodePlace({ x: 2_000_000, y: -2_000_000 })).toEqual({ x: 1_000_000, y: -1_000_000 });
  });
});

describe('withinLimit', () => {
  it('holds at most 256 places, because the server refuses a longer request whole', () => {
    const places = Array.from({ length: 300 }, (_, index) => [`n${index}`, { x: 0, y: 0 }] as const);

    expect(Object.keys(withinLimit(places))).toHaveLength(256);
  });
});

describe('isEmptyLayout', () => {
  it('is false with a start place or with a node place', () => {
    expect(isEmptyLayout({ nodes: {} })).toBe(true);
    expect(isEmptyLayout({ start: { x: 0, y: 0 }, nodes: {} })).toBe(false);
    expect(isEmptyLayout({ nodes: { a: { x: 0, y: 0 } } })).toBe(false);
  });
});

describe('mergeLayouts', () => {
  it('puts the changed places over the saved ones, and keeps the others', () => {
    expect(
      mergeLayouts(
        { start: { x: 1, y: 1 }, nodes: { a: { x: 2, y: 2 }, b: { x: 3, y: 3 } } },
        { nodes: { b: { x: 9, y: 9 } } },
      ),
    ).toEqual({ start: { x: 1, y: 1 }, nodes: { a: { x: 2, y: 2 }, b: { x: 9, y: 9 } } });
  });

  it('starts from nothing when nothing is saved', () => {
    expect(mergeLayouts(null, { nodes: { a: { x: 2, y: 2 } } })).toEqual({
      nodes: { a: { x: 2, y: 2 } },
    });
  });
});
