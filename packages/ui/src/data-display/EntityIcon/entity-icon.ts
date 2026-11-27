import type { LucideIcon } from '../../icon.ts';

/**
 * The sizes of an entity icon, in px: a name in a line of text (16), a list row (20), a row with
 * an avatar (24), the header of a section (32), a card (36), a page header (48), the centered
 * preview of a form (72, `PreviewBlock`).
 */
export type EntityIconSize = 16 | 20 | 24 | 32 | 36 | 48 | 72;

export interface EntityIconProps {
  /** The glyph. Not used with an image. */
  icon?: LucideIcon;
  /** A color of the theme (`primary`, `chart-2`) or a free color `#RRGGBB`. */
  color?: string;
  /** The URL of an image, which fills the tile. */
  image?: string;
  size?: EntityIconSize;
  /** The accessible name. With none, the icon is decorative. */
  label?: string;
  class?: string;
}

/** The tile and the glyph of each size. */
export const ENTITY_ICON_SIZES: Record<EntityIconSize, { tile: string; glyph: string }> = {
  16: { tile: 'size-4 rounded-[4px]', glyph: 'size-2.5' },
  20: { tile: 'size-5 rounded-md', glyph: 'size-3' },
  24: { tile: 'size-6 rounded-md', glyph: 'size-3.5' },
  32: { tile: 'size-8 rounded-lg', glyph: 'size-4' },
  36: { tile: 'size-9 rounded-lg', glyph: 'size-5' },
  48: { tile: 'size-12 rounded-xl', glyph: 'size-6' },
  72: { tile: 'size-18 rounded-2xl', glyph: 'size-9' },
};
