import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { render, withQueryClient, withRegistry } from '@test/render.svelte.ts';
import { ScyllaError, ScyllaResult } from '@shared/utils/scylla-result.ts';
import ResetPasswordPage from './ResetPassword.page.svelte';

let teardown: Array<() => void> = [];
let resetPassword: ReturnType<typeof vi.fn>;

const refused = () =>
  ScyllaResult.error<void>(
    new ScyllaError('Failed.', {
      cause: Object.assign(new Error('Invalid or expired token'), {
        code: 'FAILED_PRECONDITION',
      }),
    }),
  );

const openAt = (url: string, outcome = ScyllaResult.success<void>(undefined)) => {
  history.replaceState(null, '', url);
  resetPassword = vi.fn().mockResolvedValue(outcome);
  const cache = withQueryClient();
  teardown = [
    cache.restore,
    withRegistry({
      login: { loginRepository: { login: vi.fn(), requestPasswordReset: vi.fn(), resetPassword } },
    }),
  ];
  render(ResetPasswordPage);
};

beforeEach(() => {
  teardown = [];
});

afterEach(() => {
  teardown.forEach(restore => restore());
  history.replaceState(null, '', '/');
});

const choose = async (password: string, confirmation = password) => {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('New password'), password);
  await user.type(screen.getByLabelText('Confirm password'), confirmation);
  await user.click(screen.getByRole('button', { name: 'Change the password' }));
};

describe('ResetPasswordPage', () => {
  it('takes the token out of the address bar at once', () => {
    openAt('/reset-password?lang=fr#token=a-token');

    expect(window.location.pathname).toBe('/reset-password');
    expect(window.location.search).toBe('?lang=fr');
    expect(window.location.hash).toBe('');
  });

  it('sets the new password with the token of the link', async () => {
    openAt('/reset-password#token=a-token');

    await choose('hunter22');

    await waitFor(() => expect(resetPassword).toHaveBeenCalledWith('a-token', 'hunter22'));
  });

  it('offers to sign in once the password is changed', async () => {
    openAt('/reset-password#token=a-token');

    await choose('hunter22');

    expect(await screen.findByRole('status')).toHaveTextContent('Your password is changed.');
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
  });

  it('asks for a new link when the server refuses the token', async () => {
    openAt('/reset-password#token=used-token', refused());

    await choose('hunter22');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This link is not valid or has expired.',
    );
    expect(screen.getByRole('link', { name: 'Get a new link' })).toHaveAttribute(
      'href',
      '/forgot-password',
    );
  });

  it('shows the same error at once for a link with no token', () => {
    openAt('/reset-password');

    expect(screen.getByRole('alert')).toHaveTextContent('This link is not valid or has expired.');
    expect(screen.queryByLabelText('New password')).not.toBeInTheDocument();
  });

  it('refuses a password shorter than 8 characters, before any call', async () => {
    openAt('/reset-password#token=a-token');

    await choose('short');

    expect(screen.getByText('The password must have 8 to 255 characters.')).toBeInTheDocument();
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it('refuses a confirmation that differs from the new password', async () => {
    openAt('/reset-password#token=a-token');

    await choose('hunter22', 'hunter23');

    expect(screen.getByText('The two passwords are not the same.')).toBeInTheDocument();
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it('gives both fields the new-password autocomplete', () => {
    openAt('/reset-password#token=a-token');

    expect(screen.getByLabelText('New password')).toHaveAttribute('autocomplete', 'new-password');
    expect(screen.getByLabelText('Confirm password')).toHaveAttribute(
      'autocomplete',
      'new-password',
    );
  });

  it('reads a second link opened in the same tab, and starts again from the form', async () => {
    openAt('/reset-password#token=first-token');
    await choose('hunter22');
    expect(await screen.findByRole('status')).toHaveTextContent('Your password is changed.');

    window.location.hash = 'token=second-token';

    expect(await screen.findByLabelText('New password')).toHaveValue('');
    expect(window.location.hash).toBe('');
    await choose('hunter33');
    await waitFor(() => expect(resetPassword).toHaveBeenLastCalledWith('second-token', 'hunter33'));
  });

  it('shows the error of a second link with no token', async () => {
    openAt('/reset-password#token=first-token');

    window.location.hash = 'other=1';

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This link is not valid or has expired.',
    );
  });
});
