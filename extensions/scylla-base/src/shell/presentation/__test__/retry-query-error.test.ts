import { describe, it, expect } from 'vitest';
import { ScyllaError, type ScyllaErrorCode } from '@shared/utils/scylla-error.ts';
import { retryQueryError } from '../retry-query-error.ts';

const errorWith = (code: ScyllaErrorCode) => new ScyllaError('boom', { code });

describe('retryQueryError', () => {
  it('defers to the default policy for a failure that a second call can pass', () => {
    for (const code of ['UNAVAILABLE', 'DEADLINE_EXCEEDED', 'ABORTED'] as const) {
      expect(retryQueryError(0, errorWith(code))).toBeUndefined();
    }
  });

  it('vetoes a retry of a refusal, so the error page is not delayed by the backoff', () => {
    for (const code of [
      'UNAUTHENTICATED',
      'NOT_FOUND',
      'PERMISSION_DENIED',
      'INVALID_ARGUMENT',
      'FAILED_PRECONDITION',
    ] as const) {
      expect(retryQueryError(0, errorWith(code))).toBe(false);
    }
  });

  it('vetoes a retry of a bug: a second call gives the same exception', () => {
    expect(retryQueryError(0, new TypeError('x is undefined'))).toBe(false);
  });
});
