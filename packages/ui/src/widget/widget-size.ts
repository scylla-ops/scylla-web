/** The four sizes of a widget on the grid of a dashboard. */
export type WidgetSize = 'xs' | 's' | 'm' | 'l';

/** `wide`: the grid of 8 columns. `narrow`: the grid of 2 columns, below 768 px of grid width. */
export type WidgetLayout = 'narrow' | 'wide';

export interface WidgetSpan {
  columns: number;
  rows: number;
}

export interface WidgetGridMetrics {
  columns: number;
  rowHeightPx: number;
  gapPx: number;
}

export const WIDGET_GRID: Readonly<Record<WidgetLayout, WidgetGridMetrics>> = {
  narrow: { columns: 2, rowHeightPx: 80, gapPx: 12 },
  wide: { columns: 8, rowHeightPx: 98, gapPx: 16 },
};

export const WIDGET_SPANS: Readonly<Record<WidgetSize, Readonly<Record<WidgetLayout, WidgetSpan>>>> =
  {
    xs: { narrow: { columns: 1, rows: 1 }, wide: { columns: 2, rows: 1 } },
    s: { narrow: { columns: 1, rows: 2 }, wide: { columns: 2, rows: 2 } },
    m: { narrow: { columns: 2, rows: 2 }, wide: { columns: 4, rows: 2 } },
    l: { narrow: { columns: 2, rows: 4 }, wide: { columns: 4, rows: 4 } },
  };

/** The cells that a widget takes. A grid with fewer columns than the span gets a full row. */
export const widgetSpan = (
  size: WidgetSize,
  layout: WidgetLayout,
  columns: number = WIDGET_GRID[layout].columns,
): WidgetSpan => {
  const span = WIDGET_SPANS[size][layout];
  return { columns: Math.max(1, Math.min(span.columns, columns)), rows: span.rows };
};

/** The CSS variables that place a widget on `WidgetGrid`, for the two layouts. */
export const widgetSpanStyle = (size: WidgetSize): string => {
  const narrow = widgetSpan(size, 'narrow');
  const wide = widgetSpan(size, 'wide');
  return [
    `--widget-columns: ${narrow.columns}`,
    `--widget-rows: ${narrow.rows}`,
    `--widget-columns-wide: ${wide.columns}`,
    `--widget-rows-wide: ${wide.rows}`,
  ].join('; ');
};

/** The CSS variables of the tracks of `WidgetGrid`, for the two layouts. */
export const widgetGridStyle = (): string =>
  [
    `--widget-grid-columns: repeat(${WIDGET_GRID.narrow.columns}, minmax(0, 1fr))`,
    `--widget-grid-columns-wide: repeat(${WIDGET_GRID.wide.columns}, minmax(0, 1fr))`,
    `--widget-grid-row: ${WIDGET_GRID.narrow.rowHeightPx}px`,
    `--widget-grid-gap: ${WIDGET_GRID.narrow.gapPx}px`,
    `--widget-grid-row-wide: ${WIDGET_GRID.wide.rowHeightPx}px`,
    `--widget-grid-gap-wide: ${WIDGET_GRID.wide.gapPx}px`,
  ].join('; ');
