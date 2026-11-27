import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import BotIcon from '@lucide/svelte/icons/bot';
import PlayIcon from '@lucide/svelte/icons/play';
import { render } from '@test/render.ts';
import EmptyState from './EmptyState.svelte';

const props = { icon: BotIcon, title: 'Title', description: 'Body' };

describe('EmptyState', () => {
  it('keeps the text and the button out of the block of the title, so that a long text does not move the title', () => {
    render(EmptyState, { ...props, action: { label: 'Add', onSelect: vi.fn() } });

    const block = screen.getByRole('heading', { name: 'Title' }).parentElement;

    expect(block).not.toContainElement(screen.getByText('Body'));
    expect(block).not.toContainElement(screen.getByRole('button', { name: 'Add' }));
  });

  it('runs the action when the user clicks its button', async () => {
    const onSelect = vi.fn();
    render(EmptyState, { ...props, action: { label: 'Add', onSelect } });

    await userEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(onSelect).toHaveBeenCalledOnce();
  });

  it('shows no button with no action: a person who may not add sees no button that never works', () => {
    render(EmptyState, props);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows the icon of the action, a plus by default', () => {
    const { container, unmount } = render(EmptyState, {
      ...props,
      action: { label: 'Add', onSelect: vi.fn() },
    });

    expect(container.querySelector('[data-part="empty-state-action"] svg')).toHaveClass(
      'lucide-plus',
    );
    unmount();

    const run = render(EmptyState, {
      ...props,
      action: { label: 'Run', onSelect: vi.fn(), icon: PlayIcon },
    });

    expect(run.container.querySelector('[data-part="empty-state-action"] svg')).toHaveClass(
      'lucide-play',
    );
  });
});
