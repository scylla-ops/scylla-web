import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen } from '@testing-library/svelte';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import ChangeEmailPage from './ChangeEmail.page.svelte';

let teardown: Array<() => void> = [];
let confirmEmailChange: ReturnType<typeof vi.fn>;

const openAt = (url: string, refusal?: ScyllaError) => {
  history.replaceState(null, '', url);
  confirmEmailChange = refusal
    ? vi.fn().mockRejectedValue(refusal)
    : vi.fn().mockResolvedValue({ id: 'user-1', email: 'new@example.com' });
  const cache = withQueryClient();
  teardown = [cache.restore, withRegistry({ user: { userRepository: { confirmEmailChange } } })];
  render(ChangeEmailPage);
};

afterEach(() => {
  teardown.forEach(restore => restore());
  history.replaceState(null, '', '/');
});

describe('ChangeEmailPage', () => {
  it('sends the token of the link, then gives the new email', async () => {
    openAt('/change-email#token=tok-1');

    expect(await screen.findByText('Your email is now new@example.com.')).toBeInTheDocument();
    expect(confirmEmailChange).toHaveBeenCalledWith('tok-1');
    expect(window.location.hash).toBe('');
  });

  it('says that a used link is not valid', async () => {
    openAt('/change-email#token=old', new ScyllaError('used', { code: 'FAILED_PRECONDITION' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('This link is not valid any more');
  });
});
