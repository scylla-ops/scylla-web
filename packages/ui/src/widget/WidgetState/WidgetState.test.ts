import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { render } from '@test/render.ts';
import WidgetState from './WidgetState.svelte';
import type { WidgetStateKind } from './widget-state.ts';

const stateOf = (container: HTMLElement) =>
  container.querySelector('[data-slot="widget-state"]')?.getAttribute('data-state');

describe('WidgetState', () => {
  it('announces a load and draws a skeleton, with no text of a state', () => {
    const { container } = render(WidgetState, { state: 'loading', size: 'l' });

    expect(screen.getByRole('status')).toHaveTextContent('Loading');
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
    expect(screen.queryByText('Could not load')).toBeNull();
  });

  it.each([
    ['error', 'Could not load', 'The server did not answer.'],
    ['empty', 'Nothing to show', 'No data matches the period or the scope of this widget.'],
    ['all-clear', 'All clear', 'Nothing needs you now.'],
    ['locked', 'You cannot see this data', 'Ask an admin for access.'],
    ['missing', 'This item is gone', 'It was deleted, or you cannot see it any more.'],
  ] as const)('gives the state %s a generic title and description', (state, title, description) => {
    const { container } = render(WidgetState, { state, size: 's' });

    expect(stateOf(container)).toBe(state);
    expect(screen.getByText(title)).toBeInTheDocument();
    expect(screen.getByText(description)).toBeInTheDocument();
  });

  it('shows the texts of the caller instead of the generic ones', () => {
    render(WidgetState, {
      state: 'empty',
      size: 'm',
      title: 'No jobs in this period',
      description: 'Change the period or the scope of the widget.',
    });

    expect(screen.getByText('No jobs in this period')).toBeInTheDocument();
    expect(screen.getByText('Change the period or the scope of the widget.')).toBeInTheDocument();
    expect(screen.queryByText('Nothing to show')).toBeNull();
  });

  it('runs its action from a button', async () => {
    const onSelect = vi.fn();
    render(WidgetState, { state: 'error', size: 's', action: { label: 'Retry', onSelect } });

    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(onSelect).toHaveBeenCalledOnce();
  });

  it.each<WidgetStateKind>(['error', 'missing'])(
    'has no room for the action of the state %s in the size xs',
    state => {
      render(WidgetState, { state, size: 'xs', action: { label: 'Retry', onSelect: vi.fn() } });

      expect(screen.queryByRole('button')).toBeNull();
    },
  );
});
