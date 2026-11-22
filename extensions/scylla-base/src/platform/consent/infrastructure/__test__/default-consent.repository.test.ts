import { describe, it, expect, vi, afterEach } from 'vitest';
import type { TrackerNeedingConsent } from '@platform/trackers';
import type { IConsentServiceClient } from '@base/generated/scylla/platform/v1/consent_service.client.ts';
import {
  ConsentAction,
  ConsentSource,
} from '@base/generated/scylla/platform/v1/consent_service.ts';
import { unaryCall } from '@test/grpc.ts';
import type { RecordConsentInput } from '../../domain/structs/consent-choice.struct.ts';
import { DefaultConsentRepository } from '../default-consent.repository.ts';
import { sha256 } from '../sha256.ts';

const input: RecordConsentInput = {
  id: null,
  version: '0a1b2c3d',
  text: 'Your choice about cookies',
  grants: { analytics: true, support: false },
  action: 'custom',
  source: 'banner',
};

const answer = {
  consentId: { value: '019a0000-0000-7000-8000-000000000001' },
  recordedAt: { seconds: 1_795_000_000n, nanos: 0 },
};

const tracker = (name: string, type: TrackerNeedingConsent['type']): TrackerNeedingConsent => ({
  name,
  type,
  provider: 'Acme',
  owner: 'acme',
  purpose: { id: 'purpose' },
  lifetime: { id: 'lifetime' },
  exempt: false,
  consent: 'analytics',
});

const clientWith = () => {
  const client = { recordConsent: vi.fn(() => unaryCall(answer)) };
  return {
    client,
    repository: new DefaultConsentRepository(client as unknown as IConsentServiceClient),
  };
};

const clearCookies = () =>
  document.cookie
    .split('; ')
    .filter(Boolean)
    .forEach(pair => (document.cookie = `${pair.split('=')[0]}=; Path=/; Max-Age=0`));

afterEach(() => {
  clearCookies();
  localStorage.clear();
  Reflect.deleteProperty(navigator, 'globalPrivacyControl');
});

describe('DefaultConsentRepository', () => {
  it('has no choice before the first one', async () => {
    const { repository } = clientWith();

    expect(await repository.state()).toEqual({ choice: null, globalPrivacyControl: false });
  });

  it('records the choice with the SHA-256 of the text, then keeps it in the cookie', async () => {
    const { client, repository } = clientWith();

    const choice = await repository.record(input);

    expect(client.recordConsent).toHaveBeenCalledWith({
      consentId: undefined,
      bannerVersion: '0a1b2c3d',
      bannerHash: sha256('Your choice about cookies'),
      choices: [
        { purpose: 'analytics', granted: true },
        { purpose: 'support', granted: false },
      ],
      action: ConsentAction.CUSTOM,
      source: ConsentSource.BANNER,
    });
    expect(choice).toEqual({
      id: '019a0000-0000-7000-8000-000000000001',
      version: '0a1b2c3d',
      chosenAt: new Date(1_795_000_000_000).toISOString(),
      grants: { analytics: true, support: false },
    });
    expect(document.cookie).toContain('scylla_consent=');
    expect(await repository.state()).toEqual({ choice, globalPrivacyControl: false });
  });

  it('sends the consent of the browser with its next choice', async () => {
    const { client, repository } = clientWith();

    await repository.record({ ...input, id: 'consent-1', action: 'withdraw' });

    expect(client.recordConsent).toHaveBeenCalledWith(
      expect.objectContaining({
        consentId: { value: 'consent-1' },
        action: ConsentAction.WITHDRAW,
      }),
    );
  });

  it('reads Global Privacy Control as a signal of the browser', async () => {
    Object.defineProperty(navigator, 'globalPrivacyControl', { value: true, configurable: true });
    const { repository } = clientWith();

    expect((await repository.state()).globalPrivacyControl).toBe(true);
  });

  it('removes the cookies and the storage keys of the trackers, and only them', async () => {
    document.cookie = '_pa_id=1; Path=/';
    document.cookie = '_pa_ses.42=1; Path=/';
    document.cookie = 'other=1; Path=/';
    localStorage.setItem('pa-queue', '[]');
    localStorage.setItem('scylla-theme', 'dark');
    const { repository } = clientWith();

    await repository.forget([
      tracker('_pa_id', 'cookie'),
      tracker('_pa_ses.<siteId>', 'cookie'),
      tracker('pa-queue', 'local-storage'),
    ]);

    expect(document.cookie).toBe('other=1');
    expect(localStorage.getItem('pa-queue')).toBeNull();
    expect(localStorage.getItem('scylla-theme')).toBe('dark');
  });
});
