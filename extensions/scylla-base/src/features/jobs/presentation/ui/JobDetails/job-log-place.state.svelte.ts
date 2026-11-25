import { currentPathname, currentSearch, navigateTo } from '@platform/context';
import {
  jobLogSearch,
  readJobLogPlace,
} from '@base/features/jobs/presentation/presenters/job-log-place.presenter.ts';

export interface JobLogPlaceState {
  /** The node of the log, or `null` for the whole job. */
  readonly nodeId: string | null;
  readonly fullscreen: boolean;
  /** Shows the log of one node, or of the whole job with `null`. */
  select: (nodeId: string | null) => void;
  setFullscreen: (fullscreen: boolean) => void;
}

/**
 * The log that the job page shows, kept in the URL (`?node=build`, `?fullscreen=1`) so a link
 * opens the same view. `nodeIds` is a getter: the nodes arrive with the job. The query string is
 * read back from the router, never copied. A change of node drops the link to a line (`#L150`):
 * it is a line of the other log. The full screen keeps it.
 */
export const createJobLogPlace = (nodeIds: () => readonly string[]): JobLogPlaceState => {
  // Bumped by each write so the place re-reads `currentSearch()`.
  let revision = $state(0);

  const place = $derived.by(() => {
    void revision;
    return readJobLogPlace(currentSearch(), nodeIds());
  });

  const write = (change: { nodeId?: string | null; fullscreen?: boolean }) => {
    const hash = change.nodeId === undefined ? (globalThis.location?.hash ?? '') : '';
    const search = jobLogSearch(currentSearch().split('#')[0], change);
    navigateTo(`${currentPathname()}${search}${hash}`, { replace: true });
    revision += 1;
  };

  return {
    get nodeId() {
      return place.nodeId;
    },
    get fullscreen() {
      return place.fullscreen;
    },
    select: (nodeId: string | null) => {
      if (nodeId !== place.nodeId) write({ nodeId });
    },
    setFullscreen: (fullscreen: boolean) => {
      if (fullscreen !== place.fullscreen) write({ fullscreen });
    },
  };
};
