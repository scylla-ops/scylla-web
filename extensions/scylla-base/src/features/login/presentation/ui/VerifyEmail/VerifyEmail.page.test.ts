import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen } from '@testing-library/svelte';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import VerifyEmailPage from './VerifyEmail.page.svelte';

let teardown: Array<() => void> = [];
let verifyEmail: ReturnType<typeof vi.fn>;

const openAt = (url: string, refusal?: ScyllaError) => {
  history.replaceState(null, '', url);
  verifyEmail = refusal ? vi.fn().mockRejectedValue(refusal) : vi.fn().mockResolvedValue(undefined);
  const cache = withQueryClient();
  teardown = [cache.restore, withRegistry({ login: { loginRepository: { verifyEmail } } })];
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

  it('calls nothing for a link with no token', () => {
    openAt('/verify-email');

    expect(screen.getByRole('alert')).toHaveTextContent('This link is not valid any more');
    expect(verifyEmail).not.toHaveBeenCalled();
  });
});
