import type * as Login from '@base/features/login';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import { installTestNavigator } from '@test/navigator.ts';
import { withQueryClient, withRegistry } from '@test/render.ts';
import { EMPTY_OPERATOR, withLegalRepository } from '@platform/legal';
import AuthGuardFixture from './AuthGuard.fixture.svelte';
import type * as UserStateModule from '@platform/user-state';

const hasSession = vi.hoisted(() => vi.fn<() => Promise<boolean>>());
vi.mock('@base/features/login', async original => ({
  ...(await original<typeof Login>()),
  hasSession,
}));

const load = vi.hoisted(() => vi.fn());
vi.mock('@platform/user-state', async original => {
  const real = await original<typeof UserStateModule>();
  return { ...real, userState: { ...real.userState, load } };
});

let navigator: ReturnType<typeof installTestNavigator>;
let termsStatus: ReturnType<typeof vi.fn>;
let teardown: Array<() => void> = [];

const NOTHING_TO_ACCEPT: Login.TermsStatus = {
  acceptanceRequired: false,
  accepted: null,
  displayName: 'Ada Lovelace',
  email: 'ada@example.com',
};

beforeEach(() => {
  hasSession.mockReset();
  load.mockReset();
  localStorage.clear();
  navigator = installTestNavigator();
  termsStatus = vi.fn().mockResolvedValue(NOTHING_TO_ACCEPT);
  const cache = withQueryClient();
  teardown = [cache.restore, withRegistry({ login: { loginRepository: { termsStatus } } })];
});

afterEach(() => {
  navigator.restore();
  teardown.forEach(restore => restore());
});

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

  it('reads the state of the person before it renders the routes', async () => {
    localStorage.setItem('userId', 'ada');
    hasSession.mockResolvedValue(true);
    render(AuthGuardFixture);

    await screen.findByTestId('outlet');
    expect(load).toHaveBeenCalledWith('ada');
  });

  it('reads no state with no session', async () => {
    localStorage.setItem('userId', 'ada');
    hasSession.mockResolvedValue(false);
    render(AuthGuardFixture);

    await waitFor(() => expect(navigator.navigate).toHaveBeenCalled());
    expect(load).not.toHaveBeenCalled();
  });

  it('renders the routes when the session is valid', async () => {
    hasSession.mockResolvedValue(true);
    render(AuthGuardFixture);

    expect(await screen.findByTestId('outlet')).toBeInTheDocument();
    expect(navigator.navigate).not.toHaveBeenCalled();
  });

  describe('the terms of service', () => {
    it('shows the terms step instead of the routes while the user must accept them', async () => {
      hasSession.mockResolvedValue(true);
      termsStatus.mockResolvedValue({ ...NOTHING_TO_ACCEPT, acceptanceRequired: true });
      const info = vi.fn().mockResolvedValue({
        operator: EMPTY_OPERATOR,
        privacyContact: '',
        documents: [],
      });
      teardown.push(withLegalRepository({ info, update: vi.fn() }));
      render(AuthGuardFixture);

      expect(await screen.findByRole('heading', { name: 'One last step' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Accept and continue' })).toBeDisabled();
      expect(screen.queryByTestId('outlet')).not.toBeInTheDocument();
    });

    it('opens the deletion of the account for a person who refuses the terms', async () => {
      hasSession.mockResolvedValue(true);
      termsStatus.mockResolvedValue({ ...NOTHING_TO_ACCEPT, acceptanceRequired: true });
      const info = vi.fn().mockResolvedValue({
        operator: EMPTY_OPERATOR,
        privacyContact: '',
        documents: [],
      });
      teardown.push(withLegalRepository({ info, update: vi.fn() }));
      render(AuthGuardFixture);

      await userEvent.click(
        await screen.findByRole('button', { name: 'Decline and delete my account' }),
      );

      const dialog = await screen.findByRole('dialog', { name: 'Delete my account' });
      expect(within(dialog).getByLabelText('Password')).toBeInTheDocument();
      expect(screen.queryByTestId('outlet')).not.toBeInTheDocument();
    });

    it('reads the terms of the session only', async () => {
      hasSession.mockResolvedValue(false);
      render(AuthGuardFixture);

      await waitFor(() => expect(navigator.navigate).toHaveBeenCalled());
      expect(termsStatus).not.toHaveBeenCalled();
    });

    it('shows the routes when the server does not tell the terms', async () => {
      hasSession.mockResolvedValue(true);
      termsStatus.mockRejectedValue(new ScyllaError('down', { code: 'INTERNAL' }));
      render(AuthGuardFixture);

      expect(await screen.findByTestId('outlet')).toBeInTheDocument();
    });
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
