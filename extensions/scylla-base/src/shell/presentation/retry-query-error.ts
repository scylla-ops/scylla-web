import type { QueryRetryPolicy } from '@scylla/core-sdk';
import { ScyllaError } from '@shared/utils/scylla-error.ts';

/**
 * Only a network failure or a busy server can pass on a second call. A refusal (NOT_FOUND,
 * PERMISSION_DENIED, an expired token…) would only delay the error page by the retries.
 */
export const retryQueryError: QueryRetryPolicy = (_, error) =>
  ScyllaError.from(error).isTransient() ? undefined : false;
