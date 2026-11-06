import { getQueryClient, type QueryErrorHandler } from '@scylla/core-sdk';
import { toast } from '@scylla/ui/utils';
import { closeSession, loginPathBackTo } from '@base/features/login';
import { ScyllaError } from '@shared/utils/scylla-error.ts';

/** The session is gone: after the sign-in, the user comes back to this page. */
const signOutAndReturn = (): void => {
  void closeSession();
  window.location.href = loginPathBackTo(window.location);
};

/** In an outage, each query of the page fails at the same time: they share one toast. */
const UNREACHABLE_TOAST = 'server-unreachable';

/**
 * The only error toast of the app: never add an `onError` toast in a query or a
 * mutation. A failure on the network never ends the session: only the server ends
 * it, with `UNAUTHENTICATED`. A mutation that the server refused because the item
 * changed since it was read is a conflict: the toast says so, and every query is
 * invalidated so that the screen shows what the server has (the client cannot
 * know which item the server refused). An error that is not a `ScyllaError` is
 * a bug: it gets the generic message. A page that shows the error itself gets no toast and no
 * sign-out on the network, but a lost session still ends here. A query that failed at its last
 * fetch too gets no new toast: during an outage, each focus and each poll fails again.
 */
export const reportQueryError: QueryErrorHandler = (thrown, source, options) => {
  const error = ScyllaError.from(thrown);

  if (error.code === 'UNAUTHENTICATED') {
    signOutAndReturn();
    return;
  }

  error.log();

  if (options?.showsOwnError || options?.repeated) return;

  if (source === 'query' && error.isNetworkError()) {
    toast.error(error.userMessage(), { id: UNREACHABLE_TOAST });
    return;
  }

  if (source === 'mutation' && error.isConflict()) {
    toast.warning(error.userMessage());
    void getQueryClient().invalidateQueries();
    return;
  }

  toast.error(error.userMessage());
};
