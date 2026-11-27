// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  GLYPH_SHAPES,
  SCYLLA_GLYPH_AVATAR,
  glyphAvatarKey,
  type GlyphAvatar,
} from '../../structs/glyph-avatar.struct.ts';
import fixtures from './glyph-avatar.fixtures.json';
import {
  glyphDataUri,
  glyphSvg,
  randomGlyphAvatar,
  seededGlyphAvatar,
  swatchHex,
  swatchOf,
  withColor,
  withFill,
} from './glyph-avatar.ts';

describe('glyphSvg', () => {
  // scylla-ce has the same fixtures and checks its draw with dicebear-core against them.
  it.each(fixtures.map(fixture => [fixture.name, fixture] as const))(
    'draws the SVG of the server for %s',
    (_name, fixture) => {
      expect(glyphSvg(fixture.avatar as GlyphAvatar)).toBe(fixture.svg);
    },
  );

  it('draws the Scylla head with the four dots of the mark', () => {
    const svg = glyphSvg(SCYLLA_GLYPH_AVATAR);

    expect(svg.match(/<circle /g)).toHaveLength(4);
    expect(svg).toContain('fill="#5d9972"');
  });

  it('gives an image URL that holds the whole SVG', () => {
    const uri = glyphDataUri(SCYLLA_GLYPH_AVATAR);

    expect(uri.startsWith('data:image/svg+xml;charset=utf-8,')).toBe(true);
    expect(decodeURIComponent(uri.split(',')[1] ?? '')).toBe(glyphSvg(SCYLLA_GLYPH_AVATAR));
  });
});

describe('the choices of the editor', () => {
  it('offers the 35 shapes of the style, then the Scylla head', () => {
    expect(GLYPH_SHAPES).toHaveLength(36);
    expect(GLYPH_SHAPES[0]).toBe('variant01');
    expect(GLYPH_SHAPES.at(-1)).toBe('scylla');
  });

  it('picks explicit values for a random avatar', () => {
    const avatar = randomGlyphAvatar(() => 0.99);

    expect(avatar.shape).toBe('scylla');
    expect(avatar.glyph.colors).toHaveLength(1);
    expect(avatar.glyph.colors[0]).toMatch(/^#[0-9a-f]{6}$/);
    expect(avatar.scale).toBe(100);
  });

  it('gives the same first avatar for the same seed, and another one for another seed', () => {
    expect(seededGlyphAvatar('user-1')).toEqual(seededGlyphAvatar('user-1'));
    expect(glyphAvatarKey(seededGlyphAvatar('user-1'))).not.toBe(
      glyphAvatarKey(seededGlyphAvatar('user-2')),
    );
  });

  it('keeps the light value of a color of the theme, so the image does not follow the theme', () => {
    expect(swatchHex('chart-2')).toBe('#4097a6');
    expect(swatchHex('#ABCDEF')).toBe('#abcdef');
    expect(swatchOf('#4097A6', ['primary', 'chart-2'])).toBe('chart-2');
    expect(swatchOf('#123456', ['primary', 'chart-2'])).toBe('#123456');
  });

  it('adds a second color for a gradient and keeps the first for a solid fill', () => {
    const solid = { colors: ['#5d9972'], fill: 'solid', angle: 0 } as const;

    const linear = withFill(solid, 'linear');
    const back = withFill(withColor(linear, 1, '#FF0000'), 'solid');

    expect(linear.colors).toEqual(['#5d9972', '#aeccb9']);
    expect(back).toEqual({ colors: ['#5d9972'], fill: 'solid', angle: 0 });
  });

  it('gives one key for one look', () => {
    const copy = structuredClone(SCYLLA_GLYPH_AVATAR);

    expect(glyphAvatarKey(copy)).toBe(glyphAvatarKey(SCYLLA_GLYPH_AVATAR));
    expect(glyphAvatarKey({ ...copy, rotate: 15 })).not.toBe(glyphAvatarKey(copy));
  });
});
