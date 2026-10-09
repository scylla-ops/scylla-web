import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { focusSettled, render, withQueryClient, withRegistry } from '@test/render.svelte.ts';
import { ScyllaResult } from '@shared/utils/scylla-result.ts';
import AddUserDialog from './AddUserDialog.svelte';

vi.mock('svelte-sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

let teardown: Array<() => void> = [];
let create: ReturnType<typeof vi.fn>;
let setOpen: ReturnType<typeof vi.fn<(open: boolean) => void>>;

beforeEach(async () => {
  create = vi.fn().mockResolvedValue(ScyllaResult.success({ userId: 'user-9' }));
  setOpen = vi.fn<(open: boolean) => void>();
  const cache = withQueryClient();
  teardown = [cache.restore, withRegistry({ user: { userRepository: { create } } })];
  render(AddUserDialog, { open: true, setOpen });
  await screen.findByRole('dialog');
  await focusSettled();
});

afterEach(() => teardown.forEach(restore => restore()));

const fill = async (fields: Record<string, string>) => {
  const user = userEvent.setup();
  for (const [label, value] of Object.entries(fields)) {
    await user.type(screen.getByLabelText(label), value);
  }
  await user.click(screen.getByRole('button', { name: 'Create User' }));
};

const valid = {
  Email: 'grace@example.com',
  Username: 'grace',
  Password: 'hunter22',
  'Confirm password': 'hunter22',
};

describe('AddUserDialog', () => {
  it('asks for an email, a username and a password', () => {
    expect(screen.getByText('Enter an email, a username and a password.')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('autocomplete', 'email');
    expect(screen.getByLabelText('Display name')).toHaveAttribute('autocomplete', 'name');
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'new-password');
    expect(screen.getByLabelText('Confirm password')).toHaveAttribute(
      'autocomplete',
      'new-password',
    );
  });

  it('sends the email and the display name, and closes once the user exists', async () => {
    await fill({ ...valid, 'Display name': ' Grace Hopper ' });

    await waitFor(() =>
      expect(create).toHaveBeenCalledWith({
        email: 'grace@example.com',
        username: 'grace',
        password: 'hunter22',
        displayName: 'Grace Hopper',
      }),
    );
    await waitFor(() => expect(setOpen).toHaveBeenCalledWith(false));
  });

  it('sends no display name when the field is empty', async () => {
    await fill(valid);

    await waitFor(() =>
      expect(create).toHaveBeenCalledWith(expect.objectContaining({ displayName: undefined })),
    );
  });

  it('refuses a wrong email, a short password and a different confirmation', async () => {
    await fill({
      Email: 'grace',
      Username: 'grace',
      Password: 'short',
      'Confirm password': 'other',
    });

    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument();
    expect(screen.getByText('The password must have 8 to 255 characters.')).toBeInTheDocument();
    expect(screen.getByText('The two passwords are not the same.')).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });

  it('refuses a username with "@" and a display name over 100 characters', async () => {
    await fill({ ...valid, Username: '@grace', 'Display name': 'g'.repeat(101) });

    expect(screen.getByText('A username cannot contain "@".')).toBeInTheDocument();
    expect(
      screen.getByText('The display name must have 100 characters at most.'),
    ).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });
});
