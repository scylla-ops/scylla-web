import type { MessageDescriptor } from '@lingui/core';
import { colorSwatchesMessages as m } from './color-swatches.messages.ts';

/** The colors of the theme that a picker offers, before the free color. */
export const SWATCH_COLORS = [
  'primary',
  'chart-2',
  'chart-3',
  'chart-4',
  'chart-5',
  'muted-foreground',
] as const;

/** The free color of a picker that has no free color and no recent color yet. */
export const DEFAULT_FREE_COLOR = '#E879F9';

/** The name of a color of the theme, for its button. */
export const swatchName = (token: string): MessageDescriptor => {
  if (token === 'primary') return m.mainColor;
  if (token === 'muted-foreground') return m.grey;
  return m.chartColor(SWATCH_COLORS.indexOf(token as (typeof SWATCH_COLORS)[number]) + 1);
};
