// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { sizeAt, sizeBox } from '../widget-resize.presenter.ts';

const GRID = 1104;
const ALL = ['xs', 's', 'm', 'l'] as const;

describe('sizeAt', () => {
  it('gives the box of each size on the grid', () => {
    expect(sizeBox('s', GRID)).toEqual({ width: 264, height: 212 });
    expect(sizeBox('l', GRID)).toEqual({ width: 544, height: 440 });
  });

  it('takes the largest size whose box fits in the drawing', () => {
    expect(sizeAt(560, 450, GRID, ALL)).toBe('l');
    expect(sizeAt(560, 300, GRID, ALL)).toBe('m');
    expect(sizeAt(300, 300, GRID, ALL)).toBe('s');
    expect(sizeAt(300, 150, GRID, ALL)).toBe('xs');
  });

  it('lets a box pass the drawing by 5 %, not more', () => {
    expect(sizeAt(530, 420, GRID, ALL)).toBe('l');
    expect(sizeAt(515, 420, GRID, ALL)).toBe('s');
  });

  it('keeps to the sizes of the widget, and gives the smallest when nothing fits', () => {
    expect(sizeAt(560, 450, GRID, ['m'])).toBe('m');
    expect(sizeAt(600, 450, GRID, ['xs', 's'])).toBe('s');
    expect(sizeAt(20, 20, GRID, ['m', 'l'])).toBe('m');
  });
});
