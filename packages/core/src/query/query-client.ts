import { MutationCache, QueryCache, QueryClient } from '@tanstack/query-core';
import type { QueryErrorHandler, QueryRetryPolicy } from '@scylla/core-sdk';

/**
 * The app's one query cache. Every error goes to the handlers of the
 * extensions: a query or a mutation never adds its own `onError` toast.
 *
 * `@tanstack/query-core` must stay at the exact version that `@tanstack/svelte-query`
 * pins: two copies would silently split the cache.
 */
export const createAppQueryClient = (
  handlers: readonly QueryErrorHandler[],
  retryPolicies: readonly QueryRetryPolicy[] = [],
): QueryClient => {
  const report = (error: unknown, source: 'query' | 'mutation', meta?: Record<string, unknown>) => {
    if (handlers.length === 0) console.error(`Unhandled ${source} error:`, error);
    handlers.forEach(handle =>
      meta?.showsOwnError ? handle(error, source, { showsOwnError: true }) : handle(error, source),
    );
  };

  const shouldRetry = (failureCount: number, error: unknown): boolean => {
    if (retryPolicies.some(policy => policy(failureCount, error) === false)) return false;
    return failureCount < 3;
  };

  return new QueryClient({
    queryCache: new QueryCache({ onError: (error, query) => report(error, 'query', query.meta) }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) =>
        report(error, 'mutation', mutation.meta),
    }),
    defaultOptions: { queries: { retry: shouldRetry } },
  });
};
