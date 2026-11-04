import type * as Login from '@base/features/login';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/svelte';
import { installTestNavigator } from '@test/navigator.ts';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
import PersonalLayoutFixture from './PersonalLayout.fixture.svelte';

const hasSession = vi.hoisted(() => vi.fn<() => Promise<boolean>>());
vi.mock('@base/features/login', async original => ({
  ...(await original<typeof Login>()),
  hasSession,
}));

let teardown: Array<() => void> = [];
let navigator: ReturnType<typeof installTestNavigator>;

beforeEach(() => {
  localStorage.clear();
  navigator = installTestNavigator();
  const cache = withQueryClient();
  const getMe = vi
    .fn()
    .mockResolvedValue({ id: 'user-1', username: 'ada', isActive: true, updatedAt: '' });
  teardown = [cache.restore, withRegistry({ user: { userRepository: { getMe } } })];
});

afterEach(() => {
  teardown.forEach(restore => restore());
  navigator.restore();
});

describe('PersonalLayout', () => {
  it('shows the page with no organization, under a way back', async () => {
    hasSession.mockResolvedValue(true);
    render(PersonalLayoutFixture);

    expect(await screen.findByText('account page')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/');
  });

  it('has no top bar, and no link to the page it shows', async () => {
    hasSession.mockResolvedValue(true);
    render(PersonalLayoutFixture);
    await screen.findByText('account page');

    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Account' })).not.toBeInTheDocument();
  });

  it('sends a signed-out user to /login', async () => {
    hasSession.mockResolvedValue(false);
    render(PersonalLayoutFixture);

    await waitFor(() =>
      expect(navigator.navigate).toHaveBeenCalledWith(expect.stringMatching(/^\/login/), {
        replace: true,
      }),
    );
    expect(screen.queryByText('account page')).not.toBeInTheDocument();
  });
});
