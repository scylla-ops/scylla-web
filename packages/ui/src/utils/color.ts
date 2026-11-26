/** A color as red, green and blue, each from 0 to 255. */
export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** A color as hue (0 to 360), saturation (0 to 1) and value (0 to 1). */
export interface Hsv {
  h: number;
  s: number;
  v: number;
}

/** The two themes of the app. */
export type ColorTheme = 'light' | 'dark';

/** The background of a card in each theme (`--card` of `styles.css`). */
export const CARD_COLORS: Record<ColorTheme, string> = { dark: '#1E1E1C', light: '#F4F7EB' };

/** The glyph on a solid tile: white, or the near-black of the text of the light theme. */
export const LIGHT_GLYPH = '#FFFFFF';
export const DARK_GLYPH = '#171715';

/** The smallest contrast of a glyph with the card (WCAG 1.4.11, non-text contrast). */
export const MIN_GLYPH_CONTRAST = 3;

const HEX_COLOR = /^#?([0-9a-f]{6})$/i;

/** `#RRGGBB` or `RRGGBB`, else `null`. */
export const parseHex = (text: string): Rgb | null => {
  const match = HEX_COLOR.exec(text.trim());
  if (!match) return null;
  const value = Number.parseInt(match[1], 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
};

/** A free color is `#RRGGBB`; any other text names a color of the theme. */
export const isHexColor = (color: string): boolean => /^#[0-9a-f]{6}$/i.test(color);

/** `#RRGGBB`, in upper case. */
export const toHex = ({ r, g, b }: Rgb): string =>
  `#${[r, g, b]
    .map(channel =>
      Math.round(Math.min(255, Math.max(0, channel)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')
    .toUpperCase()}`;

export const hsvToRgb = ({ h, s, v }: Hsv): Rgb => {
  const hue = (((h % 360) + 360) % 360) / 60;
  const chroma = v * s;
  const x = chroma * (1 - Math.abs((hue % 2) - 1));
  const [r, g, b] =
    hue < 1
      ? [chroma, x, 0]
      : hue < 2
        ? [x, chroma, 0]
        : hue < 3
          ? [0, chroma, x]
          : hue < 4
            ? [0, x, chroma]
            : hue < 5
              ? [x, 0, chroma]
              : [chroma, 0, x];
  const m = v - chroma;
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
};

export const rgbToHsv = ({ r, g, b }: Rgb): Hsv => {
  const [red, green, blue] = [r / 255, g / 255, b / 255];
  const max = Math.max(red, green, blue);
  const delta = max - Math.min(red, green, blue);
  let h = 0;
  if (delta > 0) {
    if (max === red) h = 60 * (((green - blue) / delta) % 6);
    else if (max === green) h = 60 * ((blue - red) / delta + 2);
    else h = 60 * ((red - green) / delta + 4);
  }
  return { h: (h + 360) % 360, s: max === 0 ? 0 : delta / max, v: max };
};

const channelLuminance = (channel: number): number => {
  const value = channel / 255;
  return value <= 0.039_28 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
};

/** The relative luminance of WCAG. */
export const luminance = ({ r, g, b }: Rgb): number =>
  0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);

/** The contrast ratio of WCAG, from 1 to 21. */
export const contrastRatio = (a: Rgb, b: Rgb): number => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
};

/** How an icon tile shows a color on the card of a theme. */
export interface IconColors {
  /** The CSS background of the tile. */
  tile: string;
  /** The CSS color of the glyph. */
  glyph: string;
  /** The tile is solid, as the color alone does not contrast enough with the card. */
  solid: boolean;
  /** The contrast of the color with the card. Unset for a color of the theme. */
  ratio?: number;
  /** The contrast of the glyph with the solid tile. */
  glyphRatio?: number;
}

/**
 * The colors of an icon tile. A color of the theme (`primary`, `chart-2`) shows on its tint: the
 * theme gives it enough contrast. A free color (`#RRGGBB`) shows on its tint while it contrasts at
 * least 3:1 with the card of the theme; else the tile is solid in the color, and the glyph is white
 * or near-black, the one that contrasts more. The saved color does not change.
 */
export const iconColors = (color: string, theme: ColorTheme): IconColors => {
  const rgb = isHexColor(color) ? parseHex(color) : null;
  if (!rgb) {
    const token = `var(--${color || 'primary'})`;
    return { tile: `color-mix(in srgb, ${token} 10%, transparent)`, glyph: token, solid: false };
  }
  const hex = toHex(rgb);
  const card = parseHex(CARD_COLORS[theme]) as Rgb;
  const ratio = contrastRatio(rgb, card);
  if (ratio >= MIN_GLYPH_CONTRAST) {
    return { tile: `color-mix(in srgb, ${hex} 10%, transparent)`, glyph: hex, solid: false, ratio };
  }
  const onLight = contrastRatio(rgb, parseHex(LIGHT_GLYPH) as Rgb);
  const onDark = contrastRatio(rgb, parseHex(DARK_GLYPH) as Rgb);
  const glyph = onLight >= onDark ? LIGHT_GLYPH : DARK_GLYPH;
  return { tile: hex, glyph, solid: true, ratio, glyphRatio: Math.max(onLight, onDark) };
};
