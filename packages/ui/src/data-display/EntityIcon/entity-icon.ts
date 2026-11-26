import type { LucideIcon } from '../../icon.ts';

/** The sizes of an entity icon, in px: a list row, a card, a page header. */
export type EntityIconSize = 20 | 36 | 48;

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
  20: { tile: 'size-5 rounded-md', glyph: 'size-3' },
  36: { tile: 'size-9 rounded-lg', glyph: 'size-5' },
  48: { tile: 'size-12 rounded-xl', glyph: 'size-6' },
};
