/**
 * A glyph avatar: a figure of the DiceBear style "Glyphs" (a shoulder silhouette with a headpiece)
 * with explicit options. The server draws the same SVG from the same options, so the preview of
 * the browser is the image that the server keeps.
 */

/** The fill of a part of the figure: one color, or a gradient of 2 to 4 colors. */
export type GlyphFill = 'solid' | 'linear' | 'radial';

/** The mirror of the figure. */
export type GlyphFlip = 'none' | 'horizontal' | 'vertical' | 'both';

/** The paint of a part of the figure. The colors are `#rrggbb`. */
export interface GlyphPaint {
  colors: readonly string[];
  fill: GlyphFill;
  /** The direction of a linear gradient, in degrees: -360 to 360. */
  angle: number;
}

export interface GlyphAvatar {
  /** `variant01` to `variant35`, or `scylla` (the Scylla head). */
  shape: string;
  /** The paint of the headpiece and of the shoulders. */
  glyph: GlyphPaint;
  background: GlyphPaint;
  flip: GlyphFlip;
  /** In degrees: -360 to 360. */
  rotate: number;
  /** In percent: `GLYPH_SCALE.min` to `GLYPH_SCALE.max`. */
  scale: number;
}

/** The Scylla head: the four dots of the Scylla mark as the headpiece. */
export const SCYLLA_SHAPE = 'scylla';

/** The 35 shapes of the style, then the Scylla head. */
export const GLYPH_SHAPES: readonly string[] = [
  ...Array.from({ length: 35 }, (_, index) => `variant${String(index + 1).padStart(2, '0')}`),
  SCYLLA_SHAPE,
];

export const GLYPH_SCALE = { min: 50, max: 150, default: 100 } as const;

/** The most colors of a gradient. */
export const MAX_GLYPH_STOPS = 4;

export const WHITE_PAINT: GlyphPaint = { colors: ['#ffffff'], fill: 'solid', angle: 0 };

/** The green of the Scylla mark. */
export const SCYLLA_GREEN = '#5d9972';

/**
 * The Scylla head in the green of the mark, on white: the avatar of a new editor, and of the
 * Scylla actor (the author of the events of the system).
 */
export const SCYLLA_GLYPH_AVATAR: GlyphAvatar = {
  shape: SCYLLA_SHAPE,
  glyph: { colors: [SCYLLA_GREEN], fill: 'solid', angle: 0 },
  background: WHITE_PAINT,
  flip: 'none',
  rotate: 0,
  scale: GLYPH_SCALE.default,
};

/** A solid paint has one color, a gradient 2 to `MAX_GLYPH_STOPS`. */
export const paintColorCount = (fill: GlyphFill): { min: number; max: number } =>
  fill === 'solid' ? { min: 1, max: 1 } : { min: 2, max: MAX_GLYPH_STOPS };

/** One text for each look: a change of the text is a change of the image. */
export const glyphAvatarKey = ({ shape, glyph, background, flip, rotate, scale }: GlyphAvatar) =>
  JSON.stringify([shape, paintKey(glyph), paintKey(background), flip, rotate, scale]);

const paintKey = ({ colors, fill, angle }: GlyphPaint) => [colors, fill, angle];
