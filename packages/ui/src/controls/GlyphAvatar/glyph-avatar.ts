import { Avatar, Style, type StyleDefinition } from '@dicebear/core/lite';
import {
  GLYPH_SCALE,
  GLYPH_SHAPES,
  SCYLLA_GREEN,
  WHITE_PAINT,
  paintColorCount,
  type GlyphAvatar,
  type GlyphFill,
  type GlyphPaint,
} from '../../structs/glyph-avatar.struct.ts';
import { colorIn, isHexColor, toHex } from '../../utils/color.ts';
import definition from './glyph-style.json';

/**
 * The style "Glyphs" of DiceBear 11 with no white base under the background, and the shape
 * `scylla`. scylla-ce draws with the same file, and `glyph-avatar.fixtures.json` (the same file in
 * the two repositories) checks that the two draws give the same SVG.
 */
const style = new Style(definition as StyleDefinition);

/** The options of DiceBear for one paint, with the prefix of its part. */
const paintOptions = (part: string, paint: GlyphPaint) => ({
  [part]: [...paint.colors],
  [`${part}Fill`]: [paint.fill],
  [`${part}FillStops`]: Math.max(paint.colors.length, 2),
  [`${part}Angle`]: paint.angle,
  [`${part}Order`]: 'fixed',
});

/** The options of DiceBear: each value is explicit, and the colors keep their order. */
export const glyphOptions = (avatar: GlyphAvatar): Record<string, unknown> => ({
  shapeVariant: [avatar.shape],
  ...paintOptions('glyphColor', avatar.glyph),
  ...paintOptions('backgroundColor', avatar.background),
  flip: avatar.flip,
  rotate: avatar.rotate,
  scale: avatar.scale / 100,
});

/** The SVG of a glyph avatar, drawn in the browser: no request leaves the app. */
export const glyphSvg = (avatar: GlyphAvatar): string =>
  new Avatar(style, glyphOptions(avatar)).toString();

/** The SVG as a URL for an `img`: each image is its own document, so its ids never clash. */
export const glyphDataUri = (avatar: GlyphAvatar): string =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(glyphSvg(avatar))}`;

/** The colors of the glyph that the style suggests, then the green of the Scylla mark. */
export const GLYPH_COLORS: readonly string[] = [
  SCYLLA_GREEN,
  ...definition.colors.glyph.values,
];

/** The light backgrounds that a random avatar takes. */
const LIGHT_BACKGROUNDS = ['#ffffff', '#f4f7eb', '#eef2ff', '#fdf2f8', '#ecfeff', '#fefce8'];

/** A new avatar with explicit values, for "Random": the server keeps the values, not a seed. */
export const randomGlyphAvatar = (random: () => number = Math.random): GlyphAvatar => {
  const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)];
  return {
    shape: pick(GLYPH_SHAPES),
    glyph: { colors: [pick(GLYPH_COLORS)], fill: 'solid', angle: 0 },
    background: { colors: [pick(LIGHT_BACKGROUNDS)], fill: 'solid', angle: 0 },
    flip: 'none',
    rotate: 0,
    scale: GLYPH_SCALE.default,
  };
};

/**
 * The same avatar for the same seed (an id): the first avatar that the editor offers to a person
 * with no glyph avatar. A hash of the seed starts a small random generator (mulberry32).
 */
export const seededGlyphAvatar = (seed: string): GlyphAvatar => {
  let state = [...seed].reduce(
    (hash, char) => Math.imul(hash ^ char.charCodeAt(0), 16_777_619) >>> 0,
    2_166_136_261,
  );
  return randomGlyphAvatar(() => {
    state = (state + 0x6d_2b_79_f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
  });
};

/**
 * The `#rrggbb` of a choice of `ColorSwatches`: a color of the theme takes its value in the light
 * theme, so the image does not change with the theme of the person who saves it.
 */
export const swatchHex = (choice: string): string => {
  const rgb = colorIn(choice, 'light');
  return (rgb ? toHex(rgb) : choice).toLowerCase();
};

/** The choice of `ColorSwatches` that shows a color: its color of the theme, else the color. */
export const swatchOf = (hex: string, tokens: readonly string[]): string =>
  tokens.find(token => swatchHex(token) === hex.toLowerCase()) ?? hex;

/**
 * The paint with a new fill: a gradient keeps the colors and adds a second one (the first color,
 * lighter), and a solid fill keeps the first color.
 */
export const withFill = (paint: GlyphPaint, fill: GlyphFill): GlyphPaint => {
  const { min, max } = paintColorCount(fill);
  const colors = paint.colors.slice(0, max);
  const first = colors[0] ?? WHITE_PAINT.colors[0] ?? '#ffffff';
  while (colors.length < min) colors.push(lighter(first));
  return { ...paint, fill, colors };
};

/** The paint with one color changed. */
export const withColor = (paint: GlyphPaint, index: number, color: string): GlyphPaint => ({
  ...paint,
  colors: paint.colors.map((old, at) => (at === index && isHexColor(color) ? color.toLowerCase() : old)),
});

/** A color halfway to white. */
const lighter = (hex: string): string => {
  const rgb = colorIn(hex, 'light');
  if (!rgb) return '#ffffff';
  const half = (value: number) => Math.round(value + (255 - value) / 2);
  return toHex({ r: half(rgb.r), g: half(rgb.g), b: half(rgb.b) }).toLowerCase();
};
