import { describe, it, expect } from 'vitest';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import { termsRefusalOf } from '../terms-refusal.mapper.ts';

const refused = (reason: string, metadata: Record<string, string> = {}) =>
  Promise.reject(new ScyllaError('refused', { code: 'FAILED_PRECONDITION', reason, metadata }));

describe('termsRefusalOf', () => {
  it('gives null when the call succeeds', async () => {
    await expect(termsRefusalOf(Promise.resolve())).resolves.toBeNull();
  });

  it('gives the current version of a refusal of the terms', async () => {
    await expect(
      termsRefusalOf(refused('TERMS_NOT_ACCEPTED', { version: '2.0' })),
    ).resolves.toEqual({ currentVersion: '2.0' });
    await expect(termsRefusalOf(refused('TERMS_NOT_ACCEPTED'))).resolves.toEqual({
      currentVersion: '',
    });
  });

  it('throws any other error', async () => {
    await expect(termsRefusalOf(refused('EMAIL_IN_USE'))).rejects.toMatchObject({
      reason: 'EMAIL_IN_USE',
    });
  });
});
