import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
import SignInMethods from './SignInMethods.svelte';

vi.mock('svelte-sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

let teardown: Array<() => void> = [];

const setUp = (hasPassword: boolean) => {
  const userRepository = {
    listSignInMethods: vi.fn().mockResolvedValue({
      hasPassword,
      identities: [
        { provider: 'github', subject: '42', email: 'ada@example.com', linkedAt: '2026-01-01' },
      ],
    }),
    unlinkIdentity: vi.fn().mockResolvedValue(undefined),
  };
  const loginRepository = {
    listSignInMethods: vi.fn().mockResolvedValue({
      providers: [
        { slug: 'github', displayName: 'GitHub', kind: 'github' },
        { slug: 'corp', displayName: 'Corp SSO', kind: 'oidc' },
      ],
      signUpMode: 'closed',
    }),
  };
  const cache = withQueryClient();
  teardown = [
    cache.restore,
    withRegistry({ user: { userRepository }, login: { loginRepository } }),
  ];
  render(SignInMethods);
  return userRepository;
};

afterEach(() => teardown.forEach(restore => restore()));

describe('SignInMethods', () => {
  it('lists the identities by the name of their provider, and links another one', async () => {
    setUp(true);

    expect(await screen.findByText('GitHub')).toBeInTheDocument();
    const link = await screen.findByRole('link', { name: 'Link Corp SSO' });
    expect(link.getAttribute('href')).toMatch(/^\/auth\/corp\/start\?.*link=true/);
    expect(link).toHaveAttribute('rel', 'external');
    expect(screen.queryByRole('link', { name: 'Link GitHub' })).toBeNull();
  });

  it('unlinks an identity when a password stays', async () => {
    const repository = setUp(true);
    const user = userEvent.setup();

    await screen.findByText('GitHub');
    await user.click(screen.getByRole('button', { name: 'Unlink' }));

    await waitFor(() => expect(repository.unlinkIdentity).toHaveBeenCalledWith('github', '42'));
  });

  it('keeps the last way to sign in', async () => {
    setUp(false);

    await screen.findByText('GitHub');
    expect(screen.getByRole('button', { name: 'Unlink' })).toBeDisabled();
  });
});
