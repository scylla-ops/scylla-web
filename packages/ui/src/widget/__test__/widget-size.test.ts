// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  WIDGET_GRID,
  widgetGridStyle,
  widgetSpan,
  widgetSpanStyle,
  type WidgetLayout,
  type WidgetSize,
} from '../widget-size.ts';

/** The width and the height of a widget on a grid of this width, as the design measures it. */
const box = (size: WidgetSize, layout: WidgetLayout, gridWidth: number) => {
  const { columns, rowHeightPx, gapPx } = WIDGET_GRID[layout];
  const column = (gridWidth - gapPx * (columns - 1)) / columns;
  const span = widgetSpan(size, layout);
  return {
    width: span.columns * column + (span.columns - 1) * gapPx,
    height: span.rows * rowHeightPx + (span.rows - 1) * gapPx,
  };
};

describe('widgetSpan', () => {
  it.each([
    ['xs', 2, 1],
    ['s', 2, 2],
    ['m', 4, 2],
    ['l', 4, 4],
  ] as const)('gives %s %i columns and %i rows on the wide grid', (size, columns, rows) => {
    expect(widgetSpan(size, 'wide')).toEqual({ columns, rows });
  });

  it.each([
    ['xs', 1, 1],
    ['s', 1, 2],
    ['m', 2, 2],
    ['l', 2, 4],
  ] as const)('gives %s %i columns and %i rows on the narrow grid', (size, columns, rows) => {
    expect(widgetSpan(size, 'narrow')).toEqual({ columns, rows });
  });

  it('gives a full row when the grid has fewer columns than the span', () => {
    expect(widgetSpan('l', 'wide', 3)).toEqual({ columns: 3, rows: 4 });
    expect(widgetSpan('xs', 'wide', 0)).toEqual({ columns: 1, rows: 1 });
  });

  it('keeps the boxes of the design on a content of 1120 px', () => {
    expect(box('xs', 'wide', 1120)).toEqual({ width: 268, height: 98 });
    expect(box('s', 'wide', 1120)).toEqual({ width: 268, height: 212 });
    expect(box('m', 'wide', 1120)).toEqual({ width: 552, height: 212 });
    expect(box('l', 'wide', 1120)).toEqual({ width: 552, height: 440 });
  });

  it('keeps the widths of the design on a phone content of 358 px', () => {
    expect(box('xs', 'narrow', 358).width).toBe(173);
    expect(box('s', 'narrow', 358).width).toBe(173);
    expect(box('m', 'narrow', 358).width).toBe(358);
    expect(box('l', 'narrow', 358).width).toBe(358);
  });
});

describe('widgetSpanStyle', () => {
  it('gives the spans of the two layouts as CSS variables', () => {
    expect(widgetSpanStyle('m')).toBe(
      '--widget-columns: 2; --widget-rows: 2; --widget-columns-wide: 4; --widget-rows-wide: 2',
    );
  });
});

describe('widgetGridStyle', () => {
  it('gives 2 columns of 80 px rows and 8 columns of 98 px rows', () => {
    const style = widgetGridStyle();

    expect(style).toContain('--widget-grid-columns: repeat(2, minmax(0, 1fr))');
    expect(style).toContain('--widget-grid-columns-wide: repeat(8, minmax(0, 1fr))');
    expect(style).toContain('--widget-grid-row: 80px');
    expect(style).toContain('--widget-grid-row-wide: 98px');
    expect(style).toContain('--widget-grid-gap: 12px');
    expect(style).toContain('--widget-grid-gap-wide: 16px');
  });
});
