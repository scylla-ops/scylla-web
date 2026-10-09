import type { QueryRetryPolicy } from '@scylla/core-sdk';
import { ScyllaError } from '@shared/utils/scylla-result.ts';

/** An expired token cannot become valid between retries. */
export const retryQueryError: QueryRetryPolicy = (_, error) =>
  error instanceof ScyllaError && error.getCode() === 'UNAUTHENTICATED' ? false : undefined;
