import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import BotIcon from '@lucide/svelte/icons/bot';
import EmptyList from './EmptyList.svelte';

const props = { icon: BotIcon, title: 'Title', body: 'Body', addLabel: 'Add' };

describe('EmptyList', () => {
  it('keeps the text and the button out of the block of the title, so that a long text does not move the title', () => {
    render(EmptyList, { ...props, onAdd: vi.fn() });

    const block = screen.getByRole('heading', { name: 'Title' }).parentElement;

    expect(block).not.toContainElement(screen.getByText('Body'));
    expect(block).not.toContainElement(screen.getByRole('button', { name: 'Add' }));
  });

  it('calls onAdd when the user clicks the button', async () => {
    const onAdd = vi.fn();
    render(EmptyList, { ...props, onAdd });

    await userEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(onAdd).toHaveBeenCalledOnce();
  });

  it('shows no button with no onAdd', () => {
    render(EmptyList, props);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
