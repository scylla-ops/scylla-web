// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { entityGlyph } from '../../data-display/EntityIcon/entity-glyphs.ts';
import { SCYLLA_GLYPH_AVATAR } from '../../structs/glyph-avatar.struct.ts';
import { glyphDataUri } from '../GlyphAvatar/glyph-avatar.ts';
import {
  choiceIconProps,
  choiceKey,
  imageFileProblem,
  MAX_IMAGE_BYTES,
  searchGlyphs,
} from './icon-picker.ts';
import { iconPickerMessages } from './icon-picker.messages.ts';

const file = (type: string, size: number) => new File([new Uint8Array(size)], 'icon', { type });

describe('searchGlyphs', () => {
  it('finds a glyph by its name or a French keyword, with or without accents', () => {
    expect(searchGlyphs('rocket').map(glyph => glyph.name)).toContain('rocket');
    expect(searchGlyphs('fusee').map(glyph => glyph.name)).toContain('rocket');
    expect(searchGlyphs('serveur').map(glyph => glyph.name)).toContain('server');
    expect(searchGlyphs('zzz')).toEqual([]);
    expect(searchGlyphs('  ').length).toBeGreaterThan(40);
  });
});

describe('imageFileProblem', () => {
  it('accepts a PNG, JPEG or WebP image of 1 MB or less', () => {
    expect(imageFileProblem(file('image/png', MAX_IMAGE_BYTES))).toBeUndefined();
    expect(imageFileProblem(file('image/webp', 10))).toBeUndefined();
  });

  it('refuses a file that is too large or of another type', () => {
    expect(imageFileProblem(file('image/jpeg', MAX_IMAGE_BYTES + 1))).toBe(
      iconPickerMessages.tooLarge,
    );
    expect(imageFileProblem(file('image/svg+xml', 10))).toBe(iconPickerMessages.wrongType);
    expect(imageFileProblem(file('image/gif', 10))).toBe(iconPickerMessages.wrongType);
  });
});

describe('choiceIconProps', () => {
  it('shows the default glyph in the main color, a glyph in its color, or the image', () => {
    expect(choiceIconProps({ kind: 'default' })).toEqual({
      icon: entityGlyph('folder'),
      color: 'primary',
    });
    expect(choiceIconProps({ kind: 'glyph', name: 'rocket', color: '#E879F9' })).toEqual({
      icon: entityGlyph('rocket'),
      color: '#E879F9',
    });
    expect(choiceIconProps({ kind: 'glyph', name: 'gone', color: 'chart-2' }).icon).toBe(
      entityGlyph('folder'),
    );
    expect(choiceIconProps({ kind: 'image', url: '/images/1' })).toEqual({ image: '/images/1' });
  });

  it('shows the default glyph of the entity in its default color', () => {
    expect(choiceIconProps({ kind: 'default' }, 'bot', 'info')).toEqual({
      icon: entityGlyph('bot'),
      color: 'info',
    });
  });
});

describe('a glyph avatar as a choice', () => {
  it('shows the SVG drawn in the browser, and changes its key with its look', () => {
    const choice = { kind: 'avatar', avatar: SCYLLA_GLYPH_AVATAR } as const;
    const turned = { kind: 'avatar', avatar: { ...SCYLLA_GLYPH_AVATAR, rotate: 15 } } as const;

    expect(choiceIconProps(choice)).toEqual({ image: glyphDataUri(SCYLLA_GLYPH_AVATAR) });
    expect(choiceKey(choice)).toMatch(/^avatar:/);
    expect(choiceKey(turned)).not.toBe(choiceKey(choice));
  });
});
