import type { QueryErrorHandler } from '@scylla/core-sdk';
import { toast } from '@scylla/ui/utils';
import { ScyllaError } from '@shared/utils/scylla-result.ts';

/**
 * A network failure also signs out: the UI is served by the control plane, so
 * "unreachable" and "no longer authenticated" look the same from here.
 */
const signOut = (): void => {
  localStorage.removeItem('token');
  window.location.href = '/login';
};

/**
 * The only error toast of the app: never add an `onError` toast in a query or a
 * mutation. A mutation that fails on the network keeps the user signed in, so
 * that they can retry it.
 */
export const reportQueryError: QueryErrorHandler = (error, source) => {
  if (!(error instanceof ScyllaError)) {
    console.error(`${source === 'query' ? 'Query' : 'Mutation'} Error (Non-Scylla):`, error);
    return;
  }

  if (error.getCode() === 'UNAUTHENTICATED') {
    signOut();
    return;
  }

  error.log();

  if (source === 'query' && error.isNetworkError()) {
    signOut();
    return;
  }

  toast.error(error.userMessage());
};
