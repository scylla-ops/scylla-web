// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { actorLookToDomain, iconChangeToProto, iconToDomain } from '../icon.mapper.ts';

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
