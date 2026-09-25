import { describe, it, expect } from 'vitest';
import { ScyllaError } from '@shared/utils/scylla-result.ts';
import { retryQueryError } from '../retry-query-error.ts';

const errorWith = (code: string) => new ScyllaError('boom', { cause: { code } });

describe('retryQueryError', () => {
  it('vetoes a retry when the backend no longer knows the user', () => {
    expect(retryQueryError(0, errorWith('UNAUTHENTICATED'))).toBe(false);
  });

  it('defers to the default policy for any other Scylla error', () => {
    expect(retryQueryError(0, errorWith('UNAVAILABLE'))).toBeUndefined();
  });

  it('defers to the default policy for a non-Scylla error', () => {
    expect(retryQueryError(0, new Error('boom'))).toBeUndefined();
  });
});
