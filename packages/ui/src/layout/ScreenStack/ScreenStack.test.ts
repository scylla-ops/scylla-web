import { describe, it, expect } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { render } from '@test/render.ts';
import ScreenStackFixture from './ScreenStack.fixture.svelte';

const main = () => document.querySelector('[data-screen="main"] > div') as HTMLElement;
const second = () => screen.queryByRole('region', { name: 'Details' });

describe('ScreenStack', () => {
  it('shows the second screen over the main one, which stays with its values', async () => {
    render(ScreenStackFixture);
    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'acme');

    await userEvent.click(screen.getByRole('button', { name: 'Open' }));

    expect(second()).toBeInTheDocument();
    expect(main().inert).toBe(true);
    expect(main().parentElement).toHaveClass('opacity-0');
    expect(within(second()!).getByRole('button', { name: 'Back' })).toHaveFocus();
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('acme');
  });

  it('goes back with Back, and gives the focus to the button that opened the screen', async () => {
    render(ScreenStackFixture);
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));

    await userEvent.click(within(second()!).getByRole('button', { name: 'Back' }));

    expect(main().inert).toBe(false);
    expect(main().parentElement).not.toHaveClass('opacity-0');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Open' })).toHaveFocus());
  });

  it('goes back on Escape, and lets no other part close on it', async () => {
    render(ScreenStackFixture);
    let outside = false;
    const listen = () => (outside = true);
    document.addEventListener('keydown', listen);
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));

    await fireEvent.keyDown(within(second()!).getByRole('button', { name: 'Inside' }), {
      key: 'Escape',
    });

    document.removeEventListener('keydown', listen);
    expect(main().inert).toBe(false);
    expect(outside).toBe(false);
  });

  it('closes only the screen of the owner that goes away', async () => {
    render(ScreenStackFixture);
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));

    await fireEvent.click(screen.getByRole('button', { name: 'Close another' }));
    expect(main().inert).toBe(true);
    await fireEvent.click(screen.getByRole('button', { name: 'Close it' }));
    expect(main().inert).toBe(false);
  });
});
