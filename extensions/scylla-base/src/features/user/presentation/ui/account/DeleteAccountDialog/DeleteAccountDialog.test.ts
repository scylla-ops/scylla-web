import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { focusSettled, render } from '@test/render.svelte.ts';
import DeleteAccountDialog from './DeleteAccountDialog.svelte';

const base = { open: true, onOpenChange: vi.fn(), isPending: false, onConfirm: vi.fn() };

describe('DeleteAccountDialog', () => {
  it('asks for the current password, with its autocomplete value', async () => {
    render(DeleteAccountDialog, base);

    expect(await screen.findByLabelText('Password')).toHaveAttribute(
      'autocomplete',
      'current-password',
    );
  });

  it('confirms with the typed password', async () => {
    const onConfirm = vi.fn();
    render(DeleteAccountDialog, { ...base, onConfirm });
    await focusSettled();
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText('Password'), 'my-password');
    await user.click(screen.getByRole('button', { name: 'Delete my account' }));

    expect(onConfirm).toHaveBeenCalledWith('my-password');
  });

  it('shows the refusal of the server', async () => {
    render(DeleteAccountDialog, { ...base, refusal: 'Wrong password' });

    expect(await screen.findByRole('alert')).toHaveTextContent('Wrong password');
  });

  it('can be cancelled', async () => {
    const onOpenChange = vi.fn();
    render(DeleteAccountDialog, { ...base, onOpenChange });
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Cancel' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
