import { describe, it, expect } from 'vitest';
import FolderIcon from '@lucide/svelte/icons/folder';
import { entityGlyph } from '@scylla/ui';
import { iconChangeOf, projectIconChoice, projectIconProps } from '../project-icon.presenter.ts';

describe('projectIconProps', () => {
  it('shows the folder in the main color for a project with no icon', () => {
    expect(projectIconProps(undefined)).toEqual({ icon: FolderIcon, color: 'primary' });
  });

  it('shows a glyph in its color, and the folder for a glyph that this build does not know', () => {
    expect(projectIconProps({ kind: 'glyph', name: 'rocket', color: '#e879f9' })).toEqual({
      icon: entityGlyph('rocket'),
      color: '#e879f9',
    });
    expect(projectIconProps({ kind: 'glyph', name: 'gone' })).toEqual({
      icon: FolderIcon,
      color: 'primary',
    });
  });

  it('shows the image of the API, with the folder if it does not load', () => {
    expect(projectIconProps({ kind: 'image', imageId: 'img 1' })).toEqual({
      image: '/images/img%201',
      icon: FolderIcon,
    });
  });
});

describe('projectIconChoice', () => {
  it('opens the picker on the icon of the project', () => {
    expect(projectIconChoice(undefined)).toEqual({ kind: 'default' });
    expect(projectIconChoice({ kind: 'glyph', name: 'rocket' })).toEqual({
      kind: 'glyph',
      name: 'rocket',
      color: 'primary',
    });
    expect(projectIconChoice({ kind: 'image', imageId: 'img-1' })).toEqual({
      kind: 'image',
      url: '/images/img-1',
    });
  });
});

describe('iconChangeOf', () => {
  it('sends a glyph, or the bytes of a new image', async () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'icon.png', { type: 'image/png' });

    expect(
      await iconChangeOf({ kind: 'glyph', name: 'rocket', color: 'chart-2' }, undefined),
    ).toEqual({
      kind: 'glyph',
      name: 'rocket',
      color: 'chart-2',
    });
    expect(await iconChangeOf({ kind: 'image', url: 'blob:1', file }, undefined)).toEqual({
      kind: 'image',
      data: new Uint8Array([1, 2, 3]),
    });
  });

  it('sends nothing for the image that the project has, or the default of a project with no icon', async () => {
    const image = { kind: 'image', imageId: 'img-1' } as const;

    expect(await iconChangeOf({ kind: 'image', url: '/images/img-1' }, image)).toBeUndefined();
    expect(await iconChangeOf({ kind: 'default' }, undefined)).toBeUndefined();
    expect(await iconChangeOf({ kind: 'default' }, image)).toEqual({ kind: 'default' });
  });
});
