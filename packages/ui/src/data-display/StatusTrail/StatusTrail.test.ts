import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { render } from '@test/render.ts';
import StatusTrail from './StatusTrail.svelte';
import type { StatusTrailItem } from './status-trail.ts';

const items: StatusTrailItem[] = [
  { id: 'run-1', state: 'success', label: 'Run 1' },
  { id: 'run-2', state: 'success', label: 'Run 2' },
  { id: 'run-3', state: 'failed', label: 'Run 3' },
  { id: 'run-4', state: 'pending', label: 'Run 4' },
];

const dots = (container: HTMLElement) => [...container.querySelectorAll('[data-slot="status-trail-dot"]')];
const links = (container: HTMLElement) => [...container.querySelectorAll('[data-slot="status-trail-link"]')];

describe('StatusTrail', () => {
  it('draws one dot per item, in order, each named and keyed by its item', () => {
    const { container } = render(StatusTrail, { items, emptyLabel: 'No runs yet' });

    expect(dots(container).map(dot => dot.getAttribute('data-item-id'))).toEqual(['run-1', 'run-2', 'run-3', 'run-4']);
    expect(screen.getByRole('img', { name: 'Run 3' })).toHaveAttribute('data-state', 'failed');
  });

  it('links the dots, and lights a link only after a success', () => {
    const { container } = render(StatusTrail, { items, emptyLabel: 'No runs yet' });

    expect(links(container).map(link => link.getAttribute('data-lit'))).toEqual(['true', 'true', 'false']);
  });

  it('makes a dot a button that selects its item', async () => {
    const onSelect = vi.fn();
    render(StatusTrail, {
      items: [{ id: 'run-1', state: 'running', label: 'Run 1', onSelect }],
      emptyLabel: 'No runs yet',
    });

    await userEvent.click(screen.getByRole('button', { name: 'Run 1' }));

    expect(onSelect).toHaveBeenCalledOnce();
  });

  it('says so when there is nothing to draw', () => {
    const { container } = render(StatusTrail, { items: [], emptyLabel: 'No runs yet' });

    expect(screen.getByText('No runs yet')).toBeInTheDocument();
    expect(dots(container)).toHaveLength(0);
  });
});
