import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import VerifyEmailPage from './VerifyEmail.page.svelte';

let teardown: Array<() => void> = [];
let verifyEmail: ReturnType<typeof vi.fn>;
let resendVerificationEmail: ReturnType<typeof vi.fn>;

const openAt = (url: string, refusal?: ScyllaError) => {
  history.replaceState(null, '', url);
  verifyEmail = refusal ? vi.fn().mockRejectedValue(refusal) : vi.fn().mockResolvedValue(undefined);
  resendVerificationEmail = vi.fn().mockResolvedValue(undefined);
  const listSignInMethods = vi.fn().mockResolvedValue({
    providers: [],
    signUpMode: 'open',
    mailSender: 'no-reply@scylla.example',
  });
  const cache = withQueryClient();
  const loginRepository = { verifyEmail, resendVerificationEmail, listSignInMethods };
  teardown = [cache.restore, withRegistry({ login: { loginRepository } })];
  render(VerifyEmailPage);
};

afterEach(() => {
  teardown.forEach(restore => restore());
  history.replaceState(null, '', '/');
});

describe('VerifyEmailPage', () => {
  it('sends the token of the link one time, then offers to sign in', async () => {
    openAt('/verify-email#token=tok-1');

    expect(
      await screen.findByText('Your email address is verified. You can sign in.'),
    ).toBeInTheDocument();
    expect(verifyEmail).toHaveBeenCalledExactlyOnceWith('tok-1');
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
  });

  it('says that a refused link is not valid, and calls nothing more', async () => {
    openAt(
      '/verify-email#token=used',
      new ScyllaError('the link is used', { code: 'FAILED_PRECONDITION' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('This link is not valid any more');
  });

  it('says that a bad link is not valid, with no raw server text', async () => {
    openAt(
      '/verify-email#token=bad',
      new ScyllaError('token is not a valid link', { code: 'INVALID_ARGUMENT' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('This link is not valid any more');
    expect(screen.queryByText('token is not a valid link')).not.toBeInTheDocument();
  });

  it('sends a new link to the email that the person types, with the same answer for each email', async () => {
    openAt(
      '/verify-email#token=old',
      new ScyllaError('the link expired', { code: 'FAILED_PRECONDITION' }),
    );
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText('Email'), 'ada@example.com');
    await user.click(screen.getByRole('button', { name: 'Send the link again' }));

    await waitFor(() =>
      expect(resendVerificationEmail).toHaveBeenCalledWith('ada@example.com'),
    );
    expect(await screen.findByRole('status')).toHaveTextContent(
      'If an account with this email waits for its check, we sent it a new link.',
    );
    expect(screen.getByRole('link', { name: 'Back to sign in' })).toHaveAttribute('href', '/login');
  });

  it('shows no error at load, and shows it when the empty form is sent', async () => {
    openAt(
      '/verify-email#token=bad',
      new ScyllaError('the link expired', { code: 'FAILED_PRECONDITION' }),
    );
    const user = userEvent.setup();

    await screen.findByLabelText('Email');
    expect(screen.queryByText('Enter a valid email address.')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Send the link again' }));

    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument();
    expect(resendVerificationEmail).not.toHaveBeenCalled();
  });

  it('says in the page when the server refuses too many requests', async () => {
    openAt('/verify-email');
    resendVerificationEmail.mockRejectedValue(
      new ScyllaError('too many requests', { code: 'RESOURCE_EXHAUSTED' }),
    );
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    await user.click(screen.getByRole('button', { name: 'Send the link again' }));

    expect(
      await screen.findByText('Too many requests. Wait some minutes, then try again.'),
    ).toBeInTheDocument();
  });

  it('calls nothing for a link with no token', () => {
    openAt('/verify-email');

    expect(screen.getByRole('alert')).toHaveTextContent('This link is not valid any more');
    expect(verifyEmail).not.toHaveBeenCalled();
  });
});
