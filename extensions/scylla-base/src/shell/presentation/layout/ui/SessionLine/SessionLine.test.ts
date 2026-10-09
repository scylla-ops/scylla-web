import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import type * as Login from '@base/features/login';
import { render, withQueryClient, withRegistry } from '@test/render.svelte.ts';
import { ScyllaResult } from '@shared/utils/scylla-result.ts';
import SessionLine from './SessionLine.svelte';

const signOut = vi.fn();
vi.mock('@base/features/login', async importOriginal => ({
  ...(await importOriginal<typeof Login>()),
  signOut: () => signOut(),
}));

let teardown: Array<() => void> = [];

beforeEach(() => {
  vi.clearAllMocks();
  const cache = withQueryClient();
  const getMe = vi.fn().mockResolvedValue(
    ScyllaResult.success({
      userId: 'user-1',
      username: 'ada',
      displayName: 'Ada Lovelace',
      email: 'ada@example.com',
      isActive: true,
      updatedAt: '',
    }),
  );
  teardown = [cache.restore, withRegistry({ user: { userRepository: { getMe } } })];
});

afterEach(() => teardown.forEach(restore => restore()));

describe('SessionLine', () => {
  it('says who is signed in, with the email as a tooltip', async () => {
    render(SessionLine);

    const name = await screen.findByText('Signed in as Ada Lovelace');
    expect(name).toHaveAttribute('title', 'ada@example.com');
  });

  it('links to the account page outside any organization', () => {
    render(SessionLine);

    expect(screen.getByRole('link', { name: 'Account' })).toHaveAttribute('href', '/account');
  });

  it('signs the user out', async () => {
    render(SessionLine);

    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(signOut).toHaveBeenCalled();
  });
});
