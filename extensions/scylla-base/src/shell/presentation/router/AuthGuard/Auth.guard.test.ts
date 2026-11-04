import type * as Login from '@base/features/login';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import { installTestNavigator } from '@test/navigator.ts';
import AuthGuardFixture from './AuthGuard.fixture.svelte';

const hasSession = vi.hoisted(() => vi.fn<() => Promise<boolean>>());
vi.mock('@base/features/login', async original => ({
  ...(await original<typeof Login>()),
  hasSession,
}));

let navigator: ReturnType<typeof installTestNavigator>;

beforeEach(() => {
  navigator = installTestNavigator();
});

afterEach(() => navigator.restore());

describe('AuthGuard', () => {
  it('redirects to the sign-in page when the cookie gives no session', async () => {
    hasSession.mockResolvedValue(false);
    render(AuthGuardFixture);

    await waitFor(() =>
      expect(navigator.navigate).toHaveBeenCalledWith(expect.stringMatching(/^\/login/), {
        replace: true,
      }),
    );
    expect(screen.queryByTestId('outlet')).not.toBeInTheDocument();
  });

  it('renders the routes when the session is valid', async () => {
    hasSession.mockResolvedValue(true);
    render(AuthGuardFixture);

    expect(await screen.findByTestId('outlet')).toBeInTheDocument();
    expect(navigator.navigate).not.toHaveBeenCalled();
  });

  it('shows nothing while the session is checked', () => {
    hasSession.mockReturnValue(new Promise(() => undefined));
    render(AuthGuardFixture);

    expect(screen.queryByTestId('outlet')).not.toBeInTheDocument();
    expect(navigator.navigate).not.toHaveBeenCalled();
  });
});
