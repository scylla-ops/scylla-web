import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import ListSkeleton from './ListSkeleton.svelte';

describe('ListSkeleton', () => {
  it('shows the rows of a list that loads, hidden from a screen reader', () => {
    const { container } = render(ListSkeleton, { rows: 4, label: 'Loading the apps' });

    expect(screen.getByRole('status', { name: 'Loading the apps' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
    const rows = container.querySelectorAll('[data-slot="skeleton"]');
    expect(rows).toHaveLength(4);
    expect(rows[0]).toHaveAttribute('aria-hidden', 'true');
  });

  it('adds a title bar in the place of the header of the page', () => {
    const { container } = render(ListSkeleton, { rows: 2, header: true });

    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(4);
  });
});
