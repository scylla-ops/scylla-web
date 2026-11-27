import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { render } from '@test/render.ts';
import ColorSwatches from './ColorSwatches.svelte';

const swatch = (name: string) => screen.getByRole('button', { name });

/** The picker opens in a floating layer, which jsdom does not lay out. */
const hexField = () => screen.findByLabelText<HTMLInputElement>('Hex color');

describe('ColorSwatches', () => {
  it('names the colors of the theme and marks the chosen one', () => {
    render(ColorSwatches, { value: 'chart-4', onchange: vi.fn() });

    expect(
      screen.getAllByRole('button').map(button => button.getAttribute('aria-label')),
    ).toEqual(['Main color', 'Color 2', 'Color 3', 'Color 4', 'Color 5', 'Grey', 'Free color']);
    expect(swatch('Color 4')).toHaveAttribute('aria-pressed', 'true');
    expect(swatch('Free color')).toHaveAttribute('aria-pressed', 'false');
  });

  it('gives a color of the theme by its name', async () => {
    const onchange = vi.fn();
    render(ColorSwatches, { value: undefined, onchange });

    await userEvent.click(swatch('Color 2'));

    expect(onchange).toHaveBeenCalledWith('chart-2');
  });

  it('opens the free color on the last recent color, and chooses it', async () => {
    const onchange = vi.fn();
    render(ColorSwatches, { value: 'primary', onchange, recent: ['#22D3EE'] });

    await userEvent.click(swatch('Free color'));

    expect(onchange).toHaveBeenCalledWith('#22D3EE');
    expect(await hexField()).toHaveValue('22D3EE');
  });

  it('marks a free color, and opens on it with no new choice', async () => {
    const onchange = vi.fn();
    render(ColorSwatches, { value: '#4338CA', onchange, recent: ['#22D3EE'] });

    expect(swatch('Free color')).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(swatch('Free color'));

    expect(await hexField()).toHaveValue('4338CA');
    expect(onchange).not.toHaveBeenCalled();
  });

  it('gives each color typed in the free color', async () => {
    const onchange = vi.fn();
    render(ColorSwatches, { value: '#4338CA', onchange });
    await userEvent.click(swatch('Free color'));
    const field = await hexField();

    await userEvent.clear(field);
    await userEvent.type(field, 'BA4C43');

    expect(onchange).toHaveBeenLastCalledWith('#BA4C43');
  });

  it('refuses a choice while it is disabled', () => {
    render(ColorSwatches, { value: 'primary', onchange: vi.fn(), disabled: true });

    for (const button of screen.getAllByRole('button')) expect(button).toBeDisabled();
  });
});
