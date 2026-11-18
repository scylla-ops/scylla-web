// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { coverageOf, sizeAt, sizeBox } from '../widget-resize.presenter.ts';

const GRID = 1104;
const ALL = ['xs', 's', 'm', 'l'] as const;

describe('sizeAt', () => {
  it('gives the box of each size on the grid', () => {
    expect(sizeBox('s', GRID)).toEqual({ width: 264, height: 212 });
    expect(sizeBox('l', GRID)).toEqual({ width: 544, height: 440 });
  });

  it('measures the part of a box that the drawing covers', () => {
    expect(coverageOf('l', 544, 330, GRID)).toBeCloseTo(0.75);
    expect(coverageOf('m', 600, 300, GRID)).toBe(1);
  });

  it('takes the largest size that the drawing covers by 75 % at least', () => {
    expect(sizeAt(560, 450, GRID, ALL)).toBe('l');
    expect(sizeAt(544, 330, GRID, ALL)).toBe('l');
    expect(sizeAt(544, 329, GRID, ALL)).toBe('m');
    expect(sizeAt(408, 212, GRID, ALL)).toBe('m');
    expect(sizeAt(407, 212, GRID, ALL)).toBe('s');
    expect(sizeAt(200, 80, GRID, ALL)).toBe('xs');
  });

  it('keeps to the sizes of the widget, and gives the smallest when nothing is covered', () => {
    expect(sizeAt(560, 450, GRID, ['m'])).toBe('m');
    expect(sizeAt(600, 450, GRID, ['xs', 's'])).toBe('s');
    expect(sizeAt(20, 20, GRID, ['m', 'l'])).toBe('m');
  });
});
