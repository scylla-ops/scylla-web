// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { GlyphFill, GlyphFlip } from '@base/generated/scylla/common/v1/icon.ts';
import type { GlyphAvatar } from '@scylla/ui/structs';
import {
  actorLookToDomain,
  glyphAvatarToDomain,
  glyphAvatarToProto,
  iconChangeToProto,
  iconToDomain,
} from '../icon.mapper.ts';

const AVATAR: GlyphAvatar = {
  shape: 'scylla',
  glyph: { colors: ['#5d9972'], fill: 'solid', angle: 0 },
  background: { colors: ['#ffffff', '#4338ca'], fill: 'linear', angle: -45 },
  flip: 'horizontal',
  rotate: 15,
  scale: 120,
};

describe('iconToDomain', () => {
  it('reads a glyph, its color, and an image', () => {
    const glyph = iconToDomain({
      kind: { oneofKind: 'glyph', glyph: { name: 'server', color: 'chart-3' } },
    });
    const plain = iconToDomain({ kind: { oneofKind: 'glyph', glyph: { name: 'cpu', color: '' } } });
    const image = iconToDomain({ kind: { oneofKind: 'imageId', imageId: { value: 'img-1' } } });

    expect(glyph).toEqual({ kind: 'glyph', name: 'server', color: 'chart-3' });
    expect(plain).toEqual({ kind: 'glyph', name: 'cpu' });
    expect(image).toEqual({ kind: 'image', imageId: 'img-1' });
  });

  it('gives no icon for an icon with no kind, as from a newer server', () => {
    expect(iconToDomain({ kind: { oneofKind: undefined } })).toBeUndefined();
    expect(iconToDomain(undefined)).toBeUndefined();
  });
});

describe('iconChangeToProto', () => {
  it('sends the glyph, the bytes of an image, and no kind for the default icon', () => {
    const data = new Uint8Array([1, 2, 3]);

    expect(iconChangeToProto({ kind: 'glyph', name: 'server', color: '#a1b2c3' })).toEqual({
      kind: { oneofKind: 'glyph', glyph: { name: 'server', color: '#a1b2c3' } },
    });
    expect(iconChangeToProto({ kind: 'image', data })).toEqual({
      kind: { oneofKind: 'image', image: data },
    });
    expect(iconChangeToProto({ kind: 'default' })).toEqual({ kind: { oneofKind: undefined } });
  });
});

describe('actorLookToDomain', () => {
  const url = (id: string) => `/images/${id}`;

  it('gives the photo and the initials color of a person, and the icon of an app', () => {
    expect(actorLookToDomain({ avatar: { imageId: { value: 'img-1' }, color: '#3366cc' } }, url)).toEqual({
      avatarUrl: '/images/img-1',
      avatarColor: '#3366cc',
    });
    expect(
      actorLookToDomain(
        { icon: { kind: { oneofKind: 'glyph', glyph: { name: 'server', color: 'chart-3' } } } },
        url,
      ),
    ).toEqual({ avatarGlyph: 'server', avatarColor: 'chart-3' });
    expect(
      actorLookToDomain({ icon: { kind: { oneofKind: 'imageId', imageId: { value: 'img-2' } } } }, url),
    ).toEqual({ avatarUrl: '/images/img-2' });
    expect(actorLookToDomain({}, url)).toEqual({});
  });
});

describe('the options of a glyph avatar', () => {
  it('go to the server and come back unchanged', () => {
    const proto = glyphAvatarToProto(AVATAR);

    expect(proto.background).toEqual({
      colors: ['#ffffff', '#4338ca'],
      fill: GlyphFill.LINEAR,
      angle: -45,
    });
    expect(proto.flip).toBe(GlyphFlip.HORIZONTAL);
    expect(glyphAvatarToDomain(proto)).toEqual(AVATAR);
  });

  it('come with the image of an App, and go in a change of its icon', () => {
    const icon = iconToDomain({
      kind: { oneofKind: 'imageId', imageId: { value: 'img-1' } },
      glyphAvatar: glyphAvatarToProto(AVATAR),
    });

    expect(icon).toEqual({ kind: 'image', imageId: 'img-1', glyph: AVATAR });
    expect(iconChangeToProto({ kind: 'avatar', avatar: AVATAR })).toEqual({
      kind: { oneofKind: 'glyphAvatar', glyphAvatar: glyphAvatarToProto(AVATAR) },
    });
  });

  it('show a fill, a flip or a size that this build does not know as the default', () => {
    const avatar = glyphAvatarToDomain({
      shape: 'variant01',
      glyph: { colors: ['#000000'], fill: 9 as GlyphFill, angle: 0 },
      flip: 7 as GlyphFlip,
      rotate: 0,
      scale: 0,
    });

    expect(avatar.glyph.fill).toBe('solid');
    expect(avatar.background).toEqual({ colors: ['#ffffff'], fill: 'solid', angle: 0 });
    expect(avatar.flip).toBe('none');
    expect(avatar.scale).toBe(100);
  });
});
