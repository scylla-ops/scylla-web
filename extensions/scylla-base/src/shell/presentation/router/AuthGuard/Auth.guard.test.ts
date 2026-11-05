import type * as Login from '@base/features/login';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import { installTestNavigator } from '@test/navigator.ts';
import AuthGuardFixture from './AuthGuard.fixture.svelte';

const hasSession = vi.hoisted(() => vi.fn<() => Promise<boolean>>());
vi.mock('@base/features/login', async original => ({
  ...(await original<typeof Login>()),
  hasSession,
}));

let navigator: ReturnType<typeof installTestNavigator>;

beforeEach(() => {
  hasSession.mockReset();
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

  describe('when the server does not answer', () => {
    const down = new ScyllaError('down', { code: 'UNAVAILABLE' });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('does not go to the sign-in page, and shows the routes when it answers again', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      hasSession.mockRejectedValueOnce(down).mockResolvedValue(true);
      render(AuthGuardFixture);

      expect(await screen.findByText('The server does not answer')).toBeInTheDocument();
      expect(navigator.navigate).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(10_000);

      expect(await screen.findByTestId('outlet')).toBeInTheDocument();
      expect(navigator.navigate).not.toHaveBeenCalled();
    });

    it('tries again at once with the button', async () => {
      hasSession.mockRejectedValueOnce(down).mockResolvedValue(true);
      render(AuthGuardFixture);

      await userEvent.click(await screen.findByRole('button', { name: 'Try again' }));

      expect(await screen.findByTestId('outlet')).toBeInTheDocument();
    });

    it('goes to the sign-in page when the server then refuses the session', async () => {
      hasSession.mockRejectedValueOnce(down).mockResolvedValue(false);
      render(AuthGuardFixture);

      await userEvent.click(await screen.findByRole('button', { name: 'Try again' }));

      await waitFor(() =>
        expect(navigator.navigate).toHaveBeenCalledWith(expect.stringMatching(/^\/login/), {
          replace: true,
        }),
      );
    });
  });

  it('shows nothing while the session is checked', () => {
    hasSession.mockReturnValue(new Promise(() => undefined));
    render(AuthGuardFixture);

    expect(screen.queryByTestId('outlet')).not.toBeInTheDocument();
    expect(navigator.navigate).not.toHaveBeenCalled();
  });
});
