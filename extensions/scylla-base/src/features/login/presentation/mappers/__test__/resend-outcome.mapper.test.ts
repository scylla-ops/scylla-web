import { describe, it, expect } from 'vitest';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import { resendOutcomeOf } from '../resend-outcome.mapper.ts';

describe('resendOutcomeOf', () => {
  it('gives sent when the call succeeds', async () => {
    await expect(resendOutcomeOf(Promise.resolve())).resolves.toBe('sent');
  });

  it('gives the rate limit of the server as data', async () => {
    const limited = new ScyllaError('too many requests', { code: 'RESOURCE_EXHAUSTED' });

    await expect(resendOutcomeOf(Promise.reject(limited))).resolves.toBe('limited');
  });

  it('throws any other error', async () => {
    const invalid = new ScyllaError('bad email', { code: 'INVALID_ARGUMENT' });

    await expect(resendOutcomeOf(Promise.reject(invalid))).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });
  });
});
