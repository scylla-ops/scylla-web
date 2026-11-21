import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { msg } from '@lingui/core/macro';
import { trackersPoints, type Tracker } from '@platform/trackers';
import { render, withQueryClient, withWidgetInjections } from '@test/render.ts';
import { withConsentRepository } from '../../../consent-repository.ts';
import type { ConsentRepository } from '../../../domain/repository/consent.repository.ts';
import type {
  ConsentState,
  RecordConsentInput,
} from '../../../domain/structs/consent-choice.struct.ts';
import { consentFrame } from '../../presenters/consent.presenter.ts';
import { cookieSettings } from '../cookie-settings.state.svelte.ts';
import ConsentOverlay from './ConsentOverlay.svelte';

vi.mock('svelte-sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const tracker = (name: string, provider: string, consent: 'analytics' | 'support'): Tracker => ({
  name,
  type: 'cookie',
  provider,
  owner: 'acme',
  purpose: msg`A tracker of a test.`,
  lifetime: msg`13 months`,
  exempt: false,
  consent,
});

const TRACKERS = [
  tracker('_pa_id', 'Acme Analytics', 'analytics'),
  tracker('chat_id', 'Acme Chat', 'support'),
];

let teardown: Array<() => void> = [];
let record: ReturnType<typeof vi.fn<ConsentRepository['record']>>;
let forget: ReturnType<typeof vi.fn<ConsentRepository['forget']>>;

/** Renders the overlay; `state` gets the version of the banner. */
const setUp = (state: (version: string) => ConsentState = () => NO_CHOICE) => {
  const restoreInjections = withWidgetInjections({
    Trackers: [trackersPoints.trackers.patch(trackers => [...trackers, ...TRACKERS])],
  });
  const version = consentFrame().version;
  record = vi.fn<ConsentRepository['record']>((input: RecordConsentInput) =>
    Promise.resolve({
      id: 'consent-1',
      version: input.version,
      chosenAt: '2026-11-21T10:00:00.000Z',
      grants: input.grants,
    }),
  );
  forget = vi.fn<ConsentRepository['forget']>(() => Promise.resolve());
  const cache = withQueryClient();
  teardown = [
    restoreInjections,
    cache.restore,
    withConsentRepository({ state: () => Promise.resolve(state(version)), record, forget }),
  ];
  render(ConsentOverlay, { policy: { href: '/legal/cookies', external: false } });
  return version;
};

const NO_CHOICE: ConsentState = { choice: null, globalPrivacyControl: false };

const accepted = (version: string): ConsentState => ({
  choice: {
    id: 'consent-1',
    version,
    chosenAt: new Date().toISOString(),
    grants: { analytics: true, support: false },
  },
  globalPrivacyControl: false,
});

const banner = () => screen.findByRole('region', { name: 'Your choice about cookies' });

afterEach(() => {
  cookieSettings.close();
  teardown.forEach(restore => restore());
});

describe('ConsentOverlay', () => {
  it('asks with three buttons of the same weight while the browser has no choice', async () => {
    setUp();

    const region = await banner();

    const buttons = within(region).getAllByRole('button');
    expect(buttons.map(button => button.textContent.trim())).toEqual([
      'Reject all',
      'Customize',
      'Accept all',
    ]);
    expect(new Set(buttons.map(button => button.className)).size).toBe(1);
    expect(within(region).getByText('Purposes: Analytics, Support')).toBeInTheDocument();
    expect(within(region).getByRole('link', { name: 'Cookie policy' })).toHaveAttribute(
      'href',
      '/legal/cookies',
    );
  });

  it('records an acceptance of each purpose from the banner, then hides it', async () => {
    const version = setUp();

    await userEvent.click(within(await banner()).getByRole('button', { name: 'Accept all' }));

    await waitFor(() => expect(screen.queryByRole('region')).toBeNull());
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        id: null,
        version,
        grants: { analytics: true, support: true },
        action: 'accept-all',
        source: 'banner',
      }),
    );
    expect(record.mock.calls[0]?.[0].text).toContain('Acme Analytics');
  });

  it('records a refusal of each purpose as easily', async () => {
    setUp();

    await userEvent.click(within(await banner()).getByRole('button', { name: 'Reject all' }));

    await waitFor(() =>
      expect(record).toHaveBeenCalledWith(
        expect.objectContaining({
          grants: { analytics: false, support: false },
          action: 'reject-all',
        }),
      ),
    );
    expect(forget).toHaveBeenCalledWith(TRACKERS);
  });

  it('does not ask again while a choice holds, nor with Global Privacy Control', async () => {
    setUp(accepted);
    await waitFor(() => expect(record).not.toHaveBeenCalled());
    expect(screen.queryByRole('region')).toBeNull();

    teardown.forEach(restore => restore());
    document.body.innerHTML = '';
    setUp(() => ({ choice: null, globalPrivacyControl: true }));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(screen.queryByRole('region')).toBeNull();
  });

  it('opens the cookie settings from Customize, each purpose off and the necessary always on', async () => {
    setUp();

    await userEvent.click(within(await banner()).getByRole('button', { name: 'Customize' }));

    const dialog = await screen.findByRole('dialog', { name: 'Cookie settings' });
    const switches = within(dialog).getAllByRole('switch');
    expect(switches.map(control => control.getAttribute('aria-checked'))).toEqual([
      'true',
      'false',
      'false',
    ]);
    expect(switches[0]).toBeDisabled();
    expect(within(dialog).getByText('Partners: Acme Analytics')).toBeInTheDocument();
    expect(within(dialog).getByText(/^You have not made a choice yet\./)).toBeInTheDocument();
    expect(screen.queryByRole('region')).toBeNull();
  });

  it('saves a choice of some purposes from the account page', async () => {
    setUp();
    cookieSettings.open('account');
    const dialog = await screen.findByRole('dialog', { name: 'Cookie settings' });

    await userEvent.click(within(dialog).getAllByRole('switch')[1]);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save my choices' }));

    await waitFor(() =>
      expect(record).toHaveBeenCalledWith(
        expect.objectContaining({
          grants: { analytics: true, support: false },
          action: 'custom',
          source: 'account',
        }),
      ),
    );
    await waitFor(() => expect(cookieSettings.openFrom).toBeNull());
  });

  it('records a withdrawal as a new choice of the same consent, and removes the trackers', async () => {
    setUp(accepted);
    cookieSettings.open('preferences');
    const dialog = await screen.findByRole('dialog', { name: 'Cookie settings' });
    expect(within(dialog).getAllByRole('switch')[1]).toHaveAttribute('aria-checked', 'true');
    expect(within(dialog).getByText(/^Your last choice: /)).toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Reject all' }));

    await waitFor(() =>
      expect(record).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'consent-1', action: 'withdraw', source: 'preferences' }),
      ),
    );
    await waitFor(() => expect(forget).toHaveBeenCalledWith(TRACKERS));
  });

  it('keeps each purpose off with Global Privacy Control, and says why', async () => {
    setUp(() => ({ choice: null, globalPrivacyControl: true }));
    cookieSettings.open('preferences');

    const dialog = await screen.findByRole('dialog', { name: 'Cookie settings' });

    expect(within(dialog).getByRole('note')).toHaveTextContent('Global Privacy Control');
    within(dialog)
      .getAllByRole('switch')
      .forEach(control => expect(control).toBeDisabled());
    within(dialog)
      .getAllByRole('button')
      .filter(button => button.textContent.trim() !== 'Close')
      .forEach(button => expect(button).toBeDisabled());
  });
});
