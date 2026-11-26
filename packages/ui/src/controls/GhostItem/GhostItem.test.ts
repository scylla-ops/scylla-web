import { screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { render } from '@test/render.ts';
import GhostItem from './GhostItem.svelte';

describe('GhostItem', () => {
  it('is a link with an href', () => {
    render(GhostItem, { label: 'New project', href: '/projects/new', shape: 'row' });

    const link = screen.getByRole('link', { name: 'New project' });
    expect(link).toHaveAttribute('href', '/projects/new');
    expect(link).toHaveAttribute('data-shape', 'row');
  });

  it('is a button with no href', async () => {
    const onclick = vi.fn();
    render(GhostItem, { label: 'New project', onclick, shape: 'tile' });

    await userEvent.click(screen.getByRole('button', { name: 'New project' }));

    expect(onclick).toHaveBeenCalledOnce();
    expect(screen.getByRole('button')).toHaveAttribute('data-shape', 'tile');
  });

  it('is a card by default', () => {
    render(GhostItem, { label: 'New project', href: '/projects/new' });

    expect(screen.getByRole('link')).toHaveAttribute('data-shape', 'card');
  });
});
