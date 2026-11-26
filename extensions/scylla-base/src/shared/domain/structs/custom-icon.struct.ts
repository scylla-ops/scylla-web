/**
 * The custom icon that an admin gives to a thing of a workspace, for example an agent: a glyph
 * (a name of `ENTITY_GLYPHS`) in a color of the theme or a free color, or an uploaded image. A
 * thing with no custom icon shows the default icon of its kind.
 */
export type CustomIcon =
  | { kind: 'glyph'; name: string; color?: string }
  | { kind: 'image'; imageId: string };

/** A change of a custom icon: back to the default icon, a glyph, or a new image to upload. */
export type CustomIconChange =
  | { kind: 'default' }
  | { kind: 'glyph'; name: string; color: string }
  | { kind: 'image'; data: Uint8Array };
