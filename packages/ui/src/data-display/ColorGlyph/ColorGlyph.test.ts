import { screen } from '@testing-library/svelte';
import FolderIcon from '@lucide/svelte/icons/folder';
import { afterEach, describe, expect, it } from 'vitest';
import { render } from '@test/render.ts';
import { setThemePreference } from '../../stores/index.ts';
import ColorGlyph from './ColorGlyph.svelte';

const svgOf = (name: string) =>
  screen.getByRole('img', { name }).querySelector('svg') as SVGSVGElement;

describe('ColorGlyph', () => {
  afterEach(() => setThemePreference('dark'));

  it('draws a color of the theme as the outline, on its tint', () => {
    render(ColorGlyph, { icon: FolderIcon, color: 'chart-2', label: 'Backend' });

    const svg = svgOf('Backend');
    expect(svg.getAttribute('stroke')).toBe('var(--chart-2)');
    expect(svg.getAttribute('fill')).toContain('color-mix');
  });

  it('fills the glyph with a free color that has a low contrast on the card', () => {
    setThemePreference('dark');
    render(ColorGlyph, { icon: FolderIcon, color: '#4338CA', label: 'Docs' });

    expect(screen.getByRole('img', { name: 'Docs' }).dataset.solid).toBe('');
    expect(svgOf('Docs').getAttribute('fill')).toBe('#4338CA');
  });

  it('is grey with no fill when it has no color', () => {
    render(ColorGlyph, { icon: FolderIcon, label: 'Old' });

    const svg = svgOf('Old');
    expect(svg.getAttribute('fill')).toBe('none');
    expect(svg.getAttribute('class')).toContain('text-muted-foreground');
  });

  it('is decorative with no label', () => {
    const { container } = render(ColorGlyph, { icon: FolderIcon, color: 'primary' });

    expect(container.querySelector('[data-slot="color-glyph"]')).toHaveAttribute('aria-hidden', 'true');
  });
});
