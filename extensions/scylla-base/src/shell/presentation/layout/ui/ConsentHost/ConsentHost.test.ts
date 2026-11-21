import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen } from '@testing-library/svelte';
import { msg } from '@lingui/core/macro';
import { withConsentRepository, type ConsentRepository } from '@platform/consent';
import { EMPTY_OPERATOR, withLegalRepository } from '@platform/legal';
import { trackersPoints, type Tracker } from '@platform/trackers';
import { render, withQueryClient, withWidgetInjections } from '@test/render.ts';
import ConsentHost from './ConsentHost.svelte';

const analytics: Tracker = {
  name: '_pa_id',
  type: 'cookie',
  provider: 'Acme Analytics',
  owner: 'acme',
  purpose: msg`Counts the visits.`,
  lifetime: msg`13 months`,
  exempt: false,
  consent: 'analytics',
};

let teardown: Array<() => void> = [];
let state: ReturnType<typeof vi.fn<ConsentRepository['state']>>;

const setUp = (injections: Parameters<typeof withWidgetInjections>[0] = {}) => {
  state = vi.fn<ConsentRepository['state']>(() =>
    Promise.resolve({ choice: null, globalPrivacyControl: false }),
  );
  const cache = withQueryClient();
  teardown = [
    cache.restore,
    withWidgetInjections(injections),
    withLegalRepository({
      info: () => Promise.resolve({ operator: EMPTY_OPERATOR, privacyContact: '', documents: [] }),
      update: vi.fn(),
    }),
    withConsentRepository({ state, record: vi.fn(), forget: vi.fn() }),
  ];
  return render(ConsentHost);
};

afterEach(() => teardown.forEach(restore => restore()));

describe('ConsentHost', () => {
  it('renders nothing and reads no choice while each tracker is exempt', async () => {
    const { container } = setUp();

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(container.querySelector('*')).toBeNull();
    expect(screen.queryByRole('region')).toBeNull();
    expect(state).not.toHaveBeenCalled();
  });

  it('shows the banner on the page as soon as one tracker needs consent', async () => {
    setUp({ Analytics: [trackersPoints.trackers.patch(trackers => [...trackers, analytics])] });

    // The overlay is a lazy chunk: its first import can take more than a second.
    expect(
      await screen.findByRole('region', { name: 'Your choice about cookies' }, { timeout: 4000 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Purposes: Analytics')).toBeInTheDocument();
  });
});
