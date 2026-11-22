// @vitest-environment node
import { describe, it, expect } from 'vitest';
import type { TrackerNeedingConsent } from '@platform/trackers';
import {
  bannerNeeded,
  choiceHolds,
  consentAction,
  grantedPurposes,
  type ConsentChoice,
} from '../consent-choice.struct.ts';
import { consentVersion } from '../consent-version.struct.ts';

const NOW = new Date('2026-11-21T10:00:00.000Z');

const choice = (chosenAt: string, version = 'v1'): ConsentChoice => ({
  id: 'consent-1',
  version,
  chosenAt,
  grants: { analytics: true, support: false },
});

const tracker = (
  name: string,
  consent: TrackerNeedingConsent['consent'],
): TrackerNeedingConsent => ({
  name,
  type: 'cookie',
  provider: 'Acme',
  owner: 'acme',
  purpose: { id: 'purpose' },
  lifetime: { id: 'lifetime' },
  exempt: false,
  consent,
});

describe('a choice', () => {
  it('holds 6 months for the same version of the banner', () => {
    expect(choiceHolds(choice('2026-06-01T10:00:00.000Z'), 'v1', NOW)).toBe(true);
    expect(choiceHolds(choice('2026-05-01T10:00:00.000Z'), 'v1', NOW)).toBe(false);
    expect(choiceHolds(choice('2026-11-01T10:00:00.000Z', 'v0'), 'v1', NOW)).toBe(false);
    expect(choiceHolds(null, 'v1', NOW)).toBe(false);
  });

  it('accepts only its purposes, and nothing with Global Privacy Control or once it ends', () => {
    const recent = choice('2026-11-01T10:00:00.000Z');

    expect(grantedPurposes({ choice: recent, globalPrivacyControl: false }, 'v1', NOW)).toEqual(
      new Set(['analytics']),
    );
    expect(grantedPurposes({ choice: recent, globalPrivacyControl: true }, 'v1', NOW).size).toBe(0);
    expect(grantedPurposes({ choice: recent, globalPrivacyControl: false }, 'v2', NOW).size).toBe(
      0,
    );
  });

  it('needs the banner while no choice holds, except with Global Privacy Control', () => {
    const recent = choice('2026-11-01T10:00:00.000Z');

    expect(bannerNeeded({ choice: null, globalPrivacyControl: false }, 'v1', NOW)).toBe(true);
    expect(bannerNeeded({ choice: recent, globalPrivacyControl: false }, 'v1', NOW)).toBe(false);
    expect(bannerNeeded({ choice: recent, globalPrivacyControl: false }, 'v2', NOW)).toBe(true);
    expect(bannerNeeded({ choice: null, globalPrivacyControl: true }, 'v1', NOW)).toBe(false);
  });
});

describe('consentAction', () => {
  it('names an acceptance, a refusal and a mix', () => {
    const none = new Set<never>();

    expect(consentAction({ analytics: true, support: true }, none)).toBe('accept-all');
    expect(consentAction({ analytics: false, support: false }, none)).toBe('reject-all');
    expect(consentAction({ analytics: true, support: false }, none)).toBe('custom');
  });

  it('names a withdrawal when the choice refuses a purpose that the person accepted', () => {
    const before = new Set(['analytics'] as const);

    expect(consentAction({ analytics: false, support: false }, before)).toBe('withdraw');
    expect(consentAction({ analytics: true, support: false }, before)).toBe('custom');
  });
});

describe('consentVersion', () => {
  it('changes with the trackers, not with their order', () => {
    const one = tracker('_pa', 'analytics');
    const two = tracker('_chat', 'support');

    expect(consentVersion([one, two])).toBe(consentVersion([two, one]));
    expect(consentVersion([one, two])).not.toBe(consentVersion([one]));
    expect(consentVersion([one])).not.toBe(consentVersion([{ ...one, consent: 'marketing' }]));
    expect(consentVersion([one])).toMatch(/^[0-9a-f]{8}$/);
  });
});
