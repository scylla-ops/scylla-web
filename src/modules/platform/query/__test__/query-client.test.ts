import { describe, expect, it } from 'vitest';
import { QueryCache, QueryClient } from '@tanstack/query-core';
import { ScyllaError } from '@shared/utils/scylla-result.ts';

const retry = (failureCount: number, error: unknown) =>
  error instanceof ScyllaError && error.getCode() === 'UNAUTHENTICATED' ? false : failureCount < 3;

describe('the UNAUTHENTICATED retry rule', () => {
  it('settles on the first attempt, with no retry delay', async () => {
    let attempts = 0;
    const client = new QueryClient({
      queryCache: new QueryCache(),
      defaultOptions: { queries: { retry, retryDelay: 5000 } },
    });

    const start = Date.now();
    await expect(
      client.fetchQuery({
        queryKey: ['unauthenticated-probe'],
        queryFn: () => {
          attempts += 1;
          throw new ScyllaError('nope', { cause: { code: 'UNAUTHENTICATED' } });
        },
      }),
    ).rejects.toThrow('nope');
    const elapsed = Date.now() - start;

    expect(attempts).toBe(1);
    expect(elapsed).toBeLessThan(500);
  });

  it('still retries other errors up to 3 times', async () => {
    let attempts = 0;
    const client = new QueryClient({
      queryCache: new QueryCache(),
      defaultOptions: { queries: { retry, retryDelay: 0 } },
    });

    await expect(
      client.fetchQuery({
        queryKey: ['network-probe'],
        queryFn: () => {
          attempts += 1;
          throw new ScyllaError('down', { cause: { code: 'UNAVAILABLE' } });
        },
      }),
    ).rejects.toThrow('down');

    expect(attempts).toBe(4);
  });
});
