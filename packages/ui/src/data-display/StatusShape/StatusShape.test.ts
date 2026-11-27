import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/svelte';
import { render } from '@test/render.ts';
import StatusShape from './StatusShape.svelte';

describe('StatusShape', () => {
  it('is an image named by its label, with its state readable', () => {
    render(StatusShape, { state: 'failed', label: 'Failed' });

    expect(screen.getByRole('img', { name: 'Failed' })).toHaveAttribute('data-state', 'failed');
  });

  it('follows a change of state in place', async () => {
    const { rerender } = render(StatusShape, { state: 'running', label: 'Running' });
    const shape = screen.getByRole('img', { name: 'Running' });

    await rerender({ state: 'success', label: 'Success' });

    expect(screen.getByRole('img', { name: 'Success' })).toBe(shape);
    expect(shape).toHaveAttribute('data-state', 'success');
  });

  it('takes the size it is given', () => {
    render(StatusShape, { state: 'idle', label: 'Waiting', size: 24 });

    expect(screen.getByRole('img', { name: 'Waiting' })).toHaveStyle({ width: '24px', height: '24px' });
  });

  it.each(['idle'] as const)('shows a dashed ring, not dots, for %s', state => {
    render(StatusShape, { state, label: 'No run yet' });
    const ring = screen.getByRole('img', { name: 'No run yet' }).querySelector('[data-slot="status-shape-ring"]');

    expect(ring).toHaveClass('opacity-100', 'text-muted-foreground');
    expect(ring?.querySelector('circle')).toHaveAttribute('stroke-dasharray');
  });

  it('draws a waiting job differently from a pipeline that never ran', () => {
    render(StatusShape, { state: 'pending', label: 'Pending' });
    const ring = screen.getByRole('img', { name: 'Pending' }).querySelector('[data-slot="status-shape-ring"]');

    expect(ring).toHaveClass('opacity-100', 'text-status-queued', 'motion-reduce:animate-none');
    expect(ring?.querySelector('circle')).toHaveAttribute('stroke-dasharray', '6 5.4');
  });

  it('hides the ring once something runs', () => {
    render(StatusShape, { state: 'running', label: 'Running' });

    expect(
      screen.getByRole('img', { name: 'Running' }).querySelector('[data-slot="status-shape-ring"]'),
    ).toHaveClass('opacity-0');
  });
});
