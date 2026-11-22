import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type * as Login from '@base/features/login';
import { screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { focusSettled, render, withQueryClient, withRegistry } from '@test/render.ts';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import AccountDeletion from './AccountDeletion.svelte';

const signOut = vi.fn();
vi.mock('@base/features/login', async importOriginal => ({
  ...(await importOriginal<typeof Login>()),
  signOut: () => signOut(),
}));

let teardown: Array<() => void> = [];
let deleteAccount: ReturnType<typeof vi.fn>;

const open = (onOpenChange = vi.fn()) => {
  const cache = withQueryClient();
  teardown = [cache.restore, withRegistry({ user: { userRepository: { deleteAccount } } })];
  return render(AccountDeletion, { open: true, onOpenChange });
};

const confirmWith = async (password: string) => {
  const user = userEvent.setup();
  const dialog = await screen.findByRole('dialog');
  await focusSettled();
  await user.type(within(dialog).getByLabelText('Password'), password);
  await user.click(within(dialog).getByRole('button', { name: 'Delete my account' }));
  return dialog;
};

beforeEach(() => {
  vi.clearAllMocks();
  deleteAccount = vi.fn().mockResolvedValue(undefined);
});

afterEach(() => {
  teardown.forEach(restore => restore());
});

describe('AccountDeletion', () => {
  it('deletes the account of the session with the password, then signs out', async () => {
    open();

    await confirmWith('my-password');

    await waitFor(() => expect(deleteAccount).toHaveBeenCalledWith('my-password'));
    await waitFor(() => expect(signOut).toHaveBeenCalledOnce());
  });

  it('shows the refusal of the server, stays signed in, and forgets it at the close', async () => {
    deleteAccount.mockRejectedValue(
      new ScyllaError('Appoint another owner of Acme Corp first', {
        code: 'FAILED_PRECONDITION',
      }),
    );
    const onOpenChange = vi.fn();
    const { rerender } = open(onOpenChange);

    const dialog = await confirmWith('my-password');
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Appoint another owner of Acme Corp first',
    );
    expect(signOut).not.toHaveBeenCalled();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    await rerender({ open: false });
    await rerender({ open: true });

    await screen.findByRole('dialog');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('has no link to the export: the account page is out of reach', async () => {
    open();

    await screen.findByRole('dialog');
    expect(screen.queryByRole('link', { name: 'Download my data first' })).not.toBeInTheDocument();
  });
});
