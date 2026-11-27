import { screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { render, textSnippet } from '@test/render.ts';
import Chip from './Chip.svelte';

describe('Chip', () => {
  it('is a button with its icon and its text', async () => {
    const onclick = vi.fn();
    render(Chip, { icon: textSnippet('icon'), children: textSnippet('Payments'), onclick });

    await userEvent.click(screen.getByRole('button', { name: /Payments/ }));

    expect(onclick).toHaveBeenCalledOnce();
    expect(screen.getByText('icon')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveAttribute('data-variant', 'default');
  });

  it('has a variant for the items that do not show', () => {
    render(Chip, { variant: 'more', 'aria-label': '3 more projects', children: textSnippet('+3') });

    expect(screen.getByRole('button', { name: '3 more projects' })).toHaveAttribute(
      'data-variant',
      'more',
    );
  });
});
