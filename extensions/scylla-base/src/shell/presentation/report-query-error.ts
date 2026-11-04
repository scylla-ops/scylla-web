import { getQueryClient, type QueryErrorHandler } from '@scylla/core-sdk';
import { toast } from '@scylla/ui/utils';
import { closeSession, loginPathBackTo } from '@base/features/login';
import { ScyllaError } from '@shared/utils/scylla-error.ts';

/**
 * A network failure also signs out: the UI is served by the control plane, so
 * "unreachable" and "no longer authenticated" look the same from here.
 */
const signOut = (): void => {
  void closeSession();
  window.location.href = '/login';
};

/** The session is gone: after the sign-in, the user comes back to this page. */
const signOutAndReturn = (): void => {
  void closeSession();
  window.location.href = loginPathBackTo(window.location);
};

/**
 * The only error toast of the app: never add an `onError` toast in a query or a
 * mutation. A mutation that fails on the network keeps the user signed in, so
 * that they can retry it. A mutation that the server refused because the item
 * changed since it was read is a conflict: the toast says so, and every query is
 * invalidated so that the screen shows what the server has (the client cannot
 * know which item the server refused). An error that is not a `ScyllaError` is
 * a bug: it gets the generic message.
 */
export const reportQueryError: QueryErrorHandler = (thrown, source) => {
  const error = ScyllaError.from(thrown);

  if (error.code === 'UNAUTHENTICATED') {
    signOutAndReturn();
    return;
  }

  error.log();

  if (source === 'query' && error.isNetworkError()) {
    signOut();
    return;
  }

  if (source === 'mutation' && error.isConflict()) {
    toast.warning(error.userMessage());
    void getQueryClient().invalidateQueries();
    return;
  }

  toast.error(error.userMessage());
};
