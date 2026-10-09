import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { render, withQueryClient, withRegistry } from '@test/render.svelte.ts';
import { ScyllaResult } from '@shared/utils/scylla-result.ts';
import type { PasswordResetDelivery } from '../../../domain/structs/password-reset.struct.ts';
import ForgotPasswordPage from './ForgotPassword.page.svelte';

let teardown: Array<() => void> = [];
let requestPasswordReset: ReturnType<typeof vi.fn>;

const setUp = (delivery: PasswordResetDelivery = 'mail') => {
  requestPasswordReset = vi.fn().mockResolvedValue(ScyllaResult.success(delivery));
  const cache = withQueryClient();
  teardown = [
    cache.restore,
    withRegistry({
      login: {
        loginRepository: { login: vi.fn(), requestPasswordReset, resetPassword: vi.fn() },
      },
    }),
  ];
  render(ForgotPasswordPage);
};

beforeEach(() => {
  teardown = [];
});

afterEach(() => teardown.forEach(restore => restore()));

const requestFor = async (email: string) => {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Email'), email);
  await user.click(screen.getByRole('button', { name: 'Send the link' }));
};

describe('ForgotPasswordPage', () => {
  it('asks for the email of the account, with the browser autocomplete', () => {
    setUp();

    expect(screen.getByLabelText('Email')).toHaveAttribute('autocomplete', 'email');
  });

  it('refuses a value that is not an email, before any call', async () => {
    setUp();

    await requestFor('ada');

    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument();
    expect(requestPasswordReset).not.toHaveBeenCalled();
  });

  it('says that the link went by mail and expires in one hour', async () => {
    setUp('mail');

    await requestFor(' ada@example.com ');

    expect(await screen.findByRole('status')).toHaveTextContent(
      'If an account uses this email, we sent it a link to reset the password. The link expires in one hour.',
    );
    expect(requestPasswordReset).toHaveBeenCalledWith('ada@example.com');
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
  });

  it('sends the user to the administrator when the link is in the server log', async () => {
    setUp('server-log');

    await requestFor('ada@example.com');

    expect(await screen.findByRole('status')).toHaveTextContent(
      'If an account uses this email, the server wrote a reset link in its log. Ask your administrator for it.',
    );
  });

  it('stays neutral when the server does not say how it delivers', async () => {
    setUp('unknown');

    await requestFor('ada@example.com');

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'If an account uses this email, the server made a link to reset the password.',
      ),
    );
  });

  it('links back to the sign-in page', () => {
    setUp();

    expect(screen.getByRole('link', { name: 'Back to sign in' })).toHaveAttribute('href', '/login');
  });
});
