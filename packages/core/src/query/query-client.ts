import { MutationCache, QueryCache, QueryClient, type Query } from '@tanstack/query-core';
import type { QueryErrorHandler, QueryRetryPolicy } from '@scylla/core-sdk';

/**
 * The app's one query cache. Every error goes to the handlers of the
 * extensions: a query or a mutation never adds its own `onError` toast.
 *
 * A refetch on focus, on reconnect or by a poll fails again at each turn during an outage:
 * the handlers get `repeated` until the query has a success.
 *
 * `@tanstack/query-core` must stay at the exact version that `@tanstack/svelte-query`
 * pins: two copies would silently split the cache.
 */
export const createAppQueryClient = (
  handlers: readonly QueryErrorHandler[],
  retryPolicies: readonly QueryRetryPolicy[] = [],
): QueryClient => {
  const failing = new WeakSet<Query<unknown, unknown, unknown>>();

  const report = (
    error: unknown,
    source: 'query' | 'mutation',
    meta?: Record<string, unknown>,
    repeated = false,
  ) => {
    if (handlers.length === 0) console.error(`Unhandled ${source} error:`, error);
    const options =
      meta?.showsOwnError || repeated
        ? {
            ...(meta?.showsOwnError ? { showsOwnError: true as const } : {}),
            ...(repeated ? { repeated: true as const } : {}),
          }
        : undefined;
    handlers.forEach(handle => (options ? handle(error, source, options) : handle(error, source)));
  };

  const shouldRetry = (failureCount: number, error: unknown): boolean => {
    if (retryPolicies.some(policy => policy(failureCount, error) === false)) return false;
    return failureCount < 3;
  };

  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        report(error, 'query', query.meta, failing.has(query));
        failing.add(query);
      },
      onSuccess: (_data, query) => {
        failing.delete(query);
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) =>
        report(error, 'mutation', mutation.meta),
    }),
    defaultOptions: { queries: { retry: shouldRetry } },
  });
};
