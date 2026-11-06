// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { createAppQueryClient } from '../query-client.ts';

const failingQuery = (error: Error) => ({
  queryKey: ['failing'],
  queryFn: () => Promise.reject(error),
  retry: false,
});

describe('createAppQueryClient', () => {
  it('tells a handler that the page shows the error', async () => {
    const handler = vi.fn();
    const client = createAppQueryClient([handler]);
    const error = new Error('boom');

    await client
      .fetchQuery({ ...failingQuery(error), meta: { showsOwnError: true } })
      .catch(() => {});

    expect(handler).toHaveBeenCalledWith(error, 'query', { showsOwnError: true });
  });

  it('sends a query error to every handler, with its source', async () => {
    const first = vi.fn();
    const second = vi.fn();
    const client = createAppQueryClient([first, second]);
    const error = new Error('boom');

    await client.fetchQuery(failingQuery(error)).catch(() => {});

    expect(first).toHaveBeenCalledWith(error, 'query');
    expect(second).toHaveBeenCalledWith(error, 'query');
  });

  it('sends a mutation error with the mutation source', async () => {
    const handler = vi.fn();
    const client = createAppQueryClient([handler]);
    const error = new Error('boom');

    await client
      .getMutationCache()
      .build(client, { mutationFn: () => Promise.reject(error) })
      .execute(undefined)
      .catch(() => {});

    expect(handler).toHaveBeenCalledWith(error, 'mutation');
  });

  it('says repeated when the last fetch of the query failed too', async () => {
    const handler = vi.fn();
    const client = createAppQueryClient([handler]);
    const error = new Error('boom');

    await client.fetchQuery(failingQuery(error)).catch(() => {});
    await client.fetchQuery(failingQuery(error)).catch(() => {});

    expect(handler).toHaveBeenNthCalledWith(1, error, 'query');
    expect(handler).toHaveBeenNthCalledWith(2, error, 'query', { repeated: true });
  });

  it('keeps showsOwnError on a repeated failure', async () => {
    const handler = vi.fn();
    const client = createAppQueryClient([handler]);
    const error = new Error('boom');
    const query = { ...failingQuery(error), meta: { showsOwnError: true } };

    await client.fetchQuery(query).catch(() => {});
    await client.fetchQuery(query).catch(() => {});

    expect(handler).toHaveBeenLastCalledWith(error, 'query', {
      showsOwnError: true,
      repeated: true,
    });
  });

  it('reports a failure as new after a success of the query', async () => {
    const handler = vi.fn();
    const client = createAppQueryClient([handler]);
    const error = new Error('boom');

    await client.fetchQuery(failingQuery(error)).catch(() => {});
    await client.fetchQuery({ queryKey: ['failing'], queryFn: () => 'value' });
    await client.fetchQuery(failingQuery(error)).catch(() => {});

    expect(handler).toHaveBeenLastCalledWith(error, 'query');
  });

  it('keeps the failures of two queries apart', async () => {
    const handler = vi.fn();
    const client = createAppQueryClient([handler]);
    const error = new Error('boom');

    await client.fetchQuery(failingQuery(error)).catch(() => {});
    await client.fetchQuery({ ...failingQuery(error), queryKey: ['other'] }).catch(() => {});

    expect(handler).toHaveBeenLastCalledWith(error, 'query');
  });

  it('logs an error that no module handles, rather than dropping it', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const client = createAppQueryClient([]);

    await client.fetchQuery(failingQuery(new Error('boom'))).catch(() => {});

    expect(log).toHaveBeenCalledWith('Unhandled query error:', expect.any(Error));
    log.mockRestore();
  });
});

describe('createAppQueryClient retry', () => {
  it('retries up to 3 times by default', async () => {
    let attempts = 0;
    const client = createAppQueryClient([], []);

    await client
      .fetchQuery({
        queryKey: ['flaky'],
        queryFn: () => {
          attempts += 1;
          return Promise.reject(new Error('down'));
        },
        retryDelay: 0,
      })
      .catch(() => {});

    expect(attempts).toBe(4); // the original call plus 3 retries
  });

  it('never retries once any policy vetoes the error', async () => {
    let attempts = 0;
    const veto = () => false;
    const client = createAppQueryClient([], [veto]);

    await client
      .fetchQuery({
        queryKey: ['vetoed'],
        queryFn: () => {
          attempts += 1;
          return Promise.reject(new Error('nope'));
        },
        retryDelay: 0,
      })
      .catch(() => {});

    expect(attempts).toBe(1);
  });
});
