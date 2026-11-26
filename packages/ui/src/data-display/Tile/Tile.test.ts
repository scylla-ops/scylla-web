import { screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { render, textSnippet } from '@test/render.ts';
import Tile from './Tile.svelte';

describe('Tile', () => {
  it('shows the icon, the title and the state', () => {
    render(Tile, {
      title: 'Payments',
      icon: textSnippet('icon'),
      status: textSnippet('2 failing'),
    });

    expect(screen.getByText('icon')).toBeInTheDocument();
    expect(screen.getByText('Payments')).toHaveAttribute('title', 'Payments');
    expect(screen.getByText('2 failing')).toBeInTheDocument();
  });

  it('puts its actions in a corner, out of the centered content', () => {
    const { container } = render(Tile, {
      title: 'Payments',
      icon: textSnippet('icon'),
      actions: textSnippet('menu'),
    });

    const corner = screen.getByText('menu').parentElement;
    expect(corner?.parentElement).toBe(container.querySelector('[data-slot="tile"]'));
    expect(corner).not.toContainElement(screen.getByText('Payments'));
  });

  it('gives a click to its owner, and marks a selected tile', async () => {
    const onclick = vi.fn();
    const { container } = render(Tile, {
      title: 'Payments',
      icon: textSnippet('icon'),
      interactive: true,
      selected: true,
      onclick,
    });

    await userEvent.click(screen.getByText('Payments'));

    expect(onclick).toHaveBeenCalledOnce();
    expect(container.querySelector('[data-slot="tile"]')).toHaveAttribute('data-selected');
  });
});
