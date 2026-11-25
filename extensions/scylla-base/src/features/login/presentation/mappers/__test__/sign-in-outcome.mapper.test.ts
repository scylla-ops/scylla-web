import { describe, it, expect } from 'vitest';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import { signInOutcomeOf } from '../sign-in-outcome.mapper.ts';

const refused = (reason: string) =>
  Promise.reject(new ScyllaError('refused', { code: 'FAILED_PRECONDITION', reason }));

describe('signInOutcomeOf', () => {
  it('gives a session when the call succeeds', async () => {
    await expect(signInOutcomeOf(Promise.resolve())).resolves.toBe('signed-in');
  });

  it('gives the refusal of an email that is not verified as data', async () => {
    await expect(signInOutcomeOf(refused('EMAIL_NOT_VERIFIED'))).resolves.toBe(
      'email-not-verified',
    );
  });

  it('throws any other error', async () => {
    await expect(signInOutcomeOf(refused('SIGN_UP_CLOSED'))).rejects.toMatchObject({
      reason: 'SIGN_UP_CLOSED',
    });
  });
});
