import type { MessageDescriptor } from '@lingui/core';
import {
  entityGlyph,
  ENTITY_GLYPHS,
  type EntityGlyph,
} from '../../data-display/EntityIcon/entity-glyphs.ts';
import type { EntityIconProps } from '../../data-display/EntityIcon/entity-icon.ts';
import { matchesSearch } from '../../utils/match-search.ts';
import { iconPickerMessages as m } from './icon-picker.messages.ts';

/**
 * The choice of an icon picker. `default`: the default icon of the entity. `glyph`: a glyph of
 * the set in a color of the theme (`chart-2`) or a free color (`#RRGGBB`). `image`: an image,
 * a new file to upload or the image that the entity has.
 */
export type IconChoice =
  | { kind: 'default' }
  | { kind: 'glyph'; name: string; color: string }
  | { kind: 'image'; url: string; file?: File };

/** The colors of the theme that a picker offers, before the free color. */
export const SWATCH_COLORS = [
  'primary',
  'chart-2',
  'chart-3',
  'chart-4',
  'chart-5',
  'muted-foreground',
] as const;

/** The image types that the server accepts. */
export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;

/** The largest image that the server accepts, in bytes (1 MB). */
export const MAX_IMAGE_BYTES = 1_048_576;

/** The glyphs that match a search on their name and their keywords, in English and French. */
export const searchGlyphs = (search: string): readonly EntityGlyph[] =>
  search.trim()
    ? ENTITY_GLYPHS.filter(glyph => matchesSearch(search, [glyph.name, glyph.keywords]))
    : ENTITY_GLYPHS;

/** Why the server would refuse a file, before the upload. Undefined when it is good. */
export const imageFileProblem = (file: File): MessageDescriptor | undefined => {
  if (!(IMAGE_TYPES as readonly string[]).includes(file.type)) return m.wrongType;
  if (file.size > MAX_IMAGE_BYTES) return m.tooLarge;
  return undefined;
};

/** The props of the entity icon that shows a choice. */
export const choiceIconProps = (
  choice: IconChoice,
  defaultGlyph = 'folder',
  defaultColor = 'primary',
): EntityIconProps => {
  switch (choice.kind) {
    case 'image':
      return { image: choice.url };
    case 'glyph':
      return { icon: entityGlyph(choice.name) ?? entityGlyph(defaultGlyph), color: choice.color };
    default:
      return { icon: entityGlyph(defaultGlyph), color: defaultColor };
  }
};

/** One text for each look of a choice: a change of the text is a change of the preview. */
export const choiceKey = (choice: IconChoice): string => {
  switch (choice.kind) {
    case 'image':
      return `image:${choice.url}`;
    case 'glyph':
      return `glyph:${choice.name}:${choice.color}`;
    default:
      return 'default';
  }
};
