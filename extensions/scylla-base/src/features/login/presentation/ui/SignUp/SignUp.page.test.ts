import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { focusSettled, render, withQueryClient, withRegistry } from '@test/render.ts';
import SignUpPage from './SignUp.page.svelte';

let teardown: Array<() => void> = [];
let signUp: ReturnType<typeof vi.fn>;

const openAt = async (url: string) => {
  history.replaceState(null, '', url);
  signUp = vi.fn().mockResolvedValue(undefined);
  const cache = withQueryClient();
  teardown = [cache.restore, withRegistry({ login: { loginRepository: { signUp } } })];
  render(SignUpPage);
  await focusSettled();
};

afterEach(() => {
  teardown.forEach(restore => restore());
  history.replaceState(null, '', '/');
});

const fill = async () => {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Name'), '  Ada Lovelace ');
  await user.type(screen.getByLabelText('Email'), 'ada@example.com');
  await user.type(screen.getByLabelText('Password'), 'correct horse');
  await user.type(screen.getByLabelText('Confirm the password'), 'correct horse');
  await user.click(screen.getByRole('button', { name: 'Create the account' }));
};

describe('SignUpPage', () => {
  it('sends the trimmed name and the email, then says that a mail was sent', async () => {
    await openAt('/sign-up');

    await fill();

    await waitFor(() =>
      expect(signUp).toHaveBeenCalledWith({
        email: 'ada@example.com',
        password: 'correct horse',
        displayName: 'Ada Lovelace',
        invitationToken: '',
      }),
    );
    expect(await screen.findByRole('status')).toHaveTextContent('We sent a link to this address');
  });

  it('sends the invitation of the link, and takes it out of the address bar', async () => {
    await openAt('/sign-up#invitation=inv-42');
    expect(window.location.hash).toBe('');

    await fill();

    await waitFor(() =>
      expect(signUp).toHaveBeenCalledWith(expect.objectContaining({ invitationToken: 'inv-42' })),
    );
  });
});
