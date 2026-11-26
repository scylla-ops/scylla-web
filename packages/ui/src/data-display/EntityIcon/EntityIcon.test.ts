import { fireEvent, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import { render } from '@test/render.ts';
import { setThemePreference } from '../../stores/index.ts';
import EntityIcon from './EntityIcon.svelte';
import { entityGlyph } from './entity-glyphs.ts';

const ROCKET = entityGlyph('rocket');

describe('EntityIcon', () => {
  afterEach(() => setThemePreference('dark'));

  it('shows the glyph on the tint of a color of the theme', () => {
    render(EntityIcon, { icon: ROCKET, color: 'chart-2', label: 'staging' });

    const tile = screen.getByRole('img', { name: 'staging' });
    expect(tile.dataset.solid).toBeUndefined();
    expect(tile.querySelector('svg')).not.toBeNull();
  });

  it('makes the tile solid for a free color with low contrast on the card of the theme', () => {
    setThemePreference('dark');
    render(EntityIcon, { icon: ROCKET, color: '#4338CA', label: 'docs' });

    expect(screen.getByRole('img', { name: 'docs' }).dataset.solid).toBe('');
  });

  it('keeps the tint of the same color in the light theme', () => {
    setThemePreference('light');
    render(EntityIcon, { icon: ROCKET, color: '#4338CA', label: 'docs' });

    expect(screen.getByRole('img', { name: 'docs' }).dataset.solid).toBeUndefined();
  });

  it('shows an image, and the glyph when the image does not load', async () => {
    render(EntityIcon, { icon: ROCKET, image: '/images/gone', label: 'web' });

    const tile = screen.getByRole('img', { name: 'web' });
    const image = tile.querySelector('img') as HTMLImageElement;
    expect(image.getAttribute('src')).toBe('/images/gone');

    await fireEvent.error(image);
    expect(tile.querySelector('img')).toBeNull();
    expect(tile.querySelector('svg')).not.toBeNull();
  });
});
