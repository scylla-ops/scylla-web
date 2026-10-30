import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import type * as Login from '@base/features/login';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
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
    getMe: vi.fn().mockResolvedValue({
      userId: 'user-1',
      username: 'ada',
      isActive: true,
      updatedAt: '2025-01-01T00:00:00.000Z',
    }),
    listAccess: vi.fn().mockResolvedValue([]),
    listSessions: vi.fn().mockResolvedValue([]),
  };
  teardown = [cache.restore, withRegistry({ user: { userRepository } })];
});

afterEach(() => {
  teardown.forEach(restore => restore());
  localStorage.clear();
});

describe('PersonalAccountPage', () => {
  it('keeps the sign-out out of the header', async () => {
    render(PersonalAccountPage, { section: 'danger-zone' });

    const header = (await screen.findByRole('heading', { level: 1 })).closest('header')!;
    expect(within(header).queryByRole('button', { name: 'Sign out' })).toBeNull();
  });

  it('puts the sign-out after the section of the page', async () => {
    render(PersonalAccountPage, { section: 'danger-zone' });

    const dangerZone = await screen.findByRole('region', { name: 'Delete my account' });
    const signOutButton = screen.getByRole('button', { name: 'Sign out' });

    expect(
      dangerZone.compareDocumentPosition(signOutButton) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(dangerZone.contains(signOutButton)).toBe(false);
  });

  it('signs the user out', async () => {
    render(PersonalAccountPage, { section: 'danger-zone' });

    await userEvent.click(await screen.findByRole('button', { name: 'Sign out' }));

    expect(signOut).toHaveBeenCalled();
  });
});
