// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  contrastRatio,
  DARK_GLYPH,
  hsvToRgb,
  iconColors,
  isHexColor,
  LIGHT_GLYPH,
  parseHex,
  rgbToHsv,
  toHex,
} from '../color.ts';

const ratio = (a: string, b: string) => contrastRatio(parseHex(a)!, parseHex(b)!);

describe('parseHex and toHex', () => {
  it('reads six hex digits with or without #, in any case', () => {
    expect(parseHex('#e879f9')).toEqual({ r: 232, g: 121, b: 249 });
    expect(parseHex('4338CA')).toEqual({ r: 67, g: 56, b: 202 });
    expect(toHex({ r: 232, g: 121, b: 249 })).toBe('#E879F9');
  });

  it('refuses a short, long or non-hex text', () => {
    for (const text of ['#abc', '#a1b2c3d', 'zzzzzz', '', 'primary']) {
      expect(parseHex(text)).toBeNull();
    }
    expect(isHexColor('#A1B2C3')).toBe(true);
    expect(isHexColor('chart-2')).toBe(false);
  });
});

describe('hsvToRgb and rgbToHsv', () => {
  it('go back and forth to the same color', () => {
    for (const hex of ['#E879F9', '#4338CA', '#FF0000', '#00FF00', '#808080', '#000000']) {
      expect(toHex(hsvToRgb(rgbToHsv(parseHex(hex)!)))).toBe(hex);
    }
  });

  it('gives the pure hue at full saturation and value', () => {
    expect(toHex(hsvToRgb({ h: 0, s: 1, v: 1 }))).toBe('#FF0000');
    expect(toHex(hsvToRgb({ h: 240, s: 1, v: 1 }))).toBe('#0000FF');
    expect(toHex(hsvToRgb({ h: 360, s: 1, v: 1 }))).toBe('#FF0000');
  });
});

describe('contrastRatio', () => {
  it('gives the ratios of the design', () => {
    expect(ratio('#E879F9', '#1E1E1C')).toBeCloseTo(6.8, 1);
    expect(ratio('#E879F9', '#F4F7EB')).toBeCloseTo(2.3, 1);
    expect(ratio('#4338CA', '#1E1E1C')).toBeCloseTo(2.1, 1);
    expect(ratio('#4338CA', '#F4F7EB')).toBeCloseTo(7.3, 1);
    expect(ratio('#FFFFFF', '#000000')).toBeCloseTo(21, 5);
  });
});

describe('iconColors', () => {
  it('shows a color of the theme on its tint, with no contrast check', () => {
    expect(iconColors('chart-2', 'dark')).toEqual({
      tile: 'color-mix(in srgb, var(--chart-2) 10%, transparent)',
      glyph: 'var(--chart-2)',
      solid: false,
    });
    expect(iconColors('', 'light').glyph).toBe('var(--primary)');
  });

  it('keeps a free color that contrasts 3:1 with the card on its tint', () => {
    const colors = iconColors('#e879f9', 'dark');
    expect(colors.solid).toBe(false);
    expect(colors.glyph).toBe('#E879F9');
    expect(colors.ratio).toBeCloseTo(6.8, 1);
  });

  it('makes the tile solid with a white glyph on a dark color under 3:1', () => {
    const colors = iconColors('#4338CA', 'dark');
    expect(colors).toMatchObject({ tile: '#4338CA', glyph: LIGHT_GLYPH, solid: true });
    expect(colors.glyphRatio).toBeCloseTo(7.9, 1);
  });

  it('makes the tile solid with a near-black glyph on a light color under 3:1', () => {
    expect(iconColors('#E879F9', 'light')).toMatchObject({
      tile: '#E879F9',
      glyph: DARK_GLYPH,
      solid: true,
    });
  });
});
