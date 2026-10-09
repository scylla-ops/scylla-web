import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import type * as Login from '@base/features/login';
import { render, withQueryClient, withRegistry } from '@test/render.svelte.ts';
import { ScyllaResult } from '@shared/utils/scylla-result.ts';
import PersonalAccountPage from './PersonalAccount.page.svelte';

const signOut = vi.fn();
vi.mock('@base/features/login', async importOriginal => ({
  ...(await importOriginal<typeof Login>()),
  signOut: () => signOut(),
}));

let teardown: Array<() => void> = [];

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.setItem('userId', 'user-1');
  const cache = withQueryClient();
  const userRepository = {
    getMe: vi.fn().mockResolvedValue(
      ScyllaResult.success({
        userId: 'user-1',
        username: 'ada',
        isActive: true,
        updatedAt: '2025-01-01T00:00:00.000Z',
      }),
    ),
    listAccess: vi.fn().mockResolvedValue(ScyllaResult.success([])),
    listSessions: vi.fn().mockResolvedValue(ScyllaResult.success([])),
  };
  teardown = [cache.restore, withRegistry({ user: { userRepository } })];
});

afterEach(() => {
  teardown.forEach(restore => restore());
  localStorage.clear();
});

describe('PersonalAccountPage', () => {
  it('keeps only the title in the title row', async () => {
    render(PersonalAccountPage);

    const title = await screen.findByRole('heading', { name: 'Account' });
    expect(within(title.parentElement!).queryByRole('button', { name: 'Sign out' })).toBeNull();
  });

  it('puts the sign-out after the last section, the danger zone', async () => {
    render(PersonalAccountPage);

    const dangerZone = await screen.findByRole('region', { name: 'Danger zone' });
    const signOutButton = screen.getByRole('button', { name: 'Sign out' });

    expect(
      dangerZone.compareDocumentPosition(signOutButton) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(dangerZone.contains(signOutButton)).toBe(false);
  });

  it('signs the user out', async () => {
    render(PersonalAccountPage);

    await userEvent.click(await screen.findByRole('button', { name: 'Sign out' }));

    expect(signOut).toHaveBeenCalled();
  });
});
