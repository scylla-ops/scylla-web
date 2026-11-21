import { describe, it, expect, vi, afterEach } from 'vitest';
import { msg } from '@lingui/core/macro';
import { trackersPoints, type Tracker } from '@platform/trackers';
import { withWidgetInjections } from '@test/render.ts';
import { withConsentRepository } from '../../consent-repository.ts';
import type { ConsentState } from '../../domain/structs/consent-choice.struct.ts';
import { applyGrants, resetLoaders, whenGranted } from '../consent.loaders.ts';
import { consentFrame } from '../presenters/consent.presenter.ts';

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

const setUp = (state: (version: string) => ConsentState) => {
  const restoreInjections = withWidgetInjections({
    Analytics: [trackersPoints.trackers.patch(trackers => [...trackers, analytics])],
  });
  const version = consentFrame().version;
  teardown = [
    restoreInjections,
    withConsentRepository({
      state: () => Promise.resolve(state(version)),
      record: vi.fn(),
      forget: vi.fn(),
    }),
  ];
};

const accepted = (version: string): ConsentState => ({
  choice: {
    id: 'consent-1',
    version,
    chosenAt: new Date().toISOString(),
    grants: { analytics: true },
  },
  globalPrivacyControl: false,
});

afterEach(() => {
  teardown.forEach(restore => restore());
  resetLoaders();
});

describe('whenGranted', () => {
  it('loads at once when the choice of the browser accepts the purpose', async () => {
    setUp(accepted);
    const load = vi.fn();

    await whenGranted('analytics', load);

    expect(load).toHaveBeenCalledTimes(1);
  });

  it('waits for a later choice when the browser has none, and loads once', async () => {
    setUp(() => ({ choice: null, globalPrivacyControl: false }));
    const load = vi.fn();

    await whenGranted('analytics', load);
    expect(load).not.toHaveBeenCalled();

    applyGrants(new Set(['analytics']));
    applyGrants(new Set(['analytics']));
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('never loads with Global Privacy Control', async () => {
    setUp(version => ({ ...accepted(version), globalPrivacyControl: true }));
    const load = vi.fn();

    await whenGranted('analytics', load);

    expect(load).not.toHaveBeenCalled();
  });

  it('tells which loaded purposes a new choice refuses', async () => {
    setUp(accepted);
    await whenGranted('analytics', vi.fn());

    expect(applyGrants(new Set())).toEqual(['analytics']);
  });
});
