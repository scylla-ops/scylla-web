import type { GlyphAvatar } from '@scylla/ui/structs';

/**
 * The custom icon that an admin gives to a thing of a workspace, for example an agent: a glyph
 * (a name of `ENTITY_GLYPHS`) in a color of the theme or a free color, or an uploaded image. A
 * thing with no custom icon shows the default icon of its kind. `glyph` holds the options of an
 * image that the server drew as a glyph avatar (an App only), for a new edit.
 */
export type CustomIcon =
  | { kind: 'glyph'; name: string; color?: string }
  | { kind: 'image'; imageId: string; glyph?: GlyphAvatar };

/**
 * A change of a custom icon: back to the default icon, a glyph, a new image to upload, or a glyph
 * avatar that the server draws (an App only).
 */
export type CustomIconChange =
  | { kind: 'default' }
  | { kind: 'glyph'; name: string; color: string }
  | { kind: 'image'; data: Uint8Array }
  | { kind: 'avatar'; avatar: GlyphAvatar };
