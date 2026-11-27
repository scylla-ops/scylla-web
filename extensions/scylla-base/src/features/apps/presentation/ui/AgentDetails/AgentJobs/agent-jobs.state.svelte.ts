import { createQuery } from '@scylla/core-sdk';
import { appQueries } from '@base/features/apps/presentation/apps.queries.ts';
import {
  JOB_FILTER_STATUSES,
  type JobFilterKey,
} from '@base/features/apps/presentation/presenters/agent-jobs.presenter.ts';

/** The jobs of one step of the list: "Show 10 more" adds as many. */
export const JOBS_STEP = 10;

/** A search waits for the end of the typing. */
export const SEARCH_DELAY_MS = 300;

interface Props {
  workspaceId: string;
  appId: string;
  /** `list_jobs_by_workspace`. */
  enabled: boolean;
}

/**
 * The jobs of the Jobs tab: a filter of the states, a search, and a list that grows by 10. A new
 * filter or search starts the list again at 10 jobs.
 */
export const createAgentJobs = (props: () => Props) => {
  let filter = $state<JobFilterKey>('all');
  let text = $state('');
  let search = $state('');
  let limit = $state(JOBS_STEP);
  let timer: ReturnType<typeof setTimeout> | undefined;
  $effect(() => () => clearTimeout(timer));

  const list = createQuery(() =>
    appQueries.jobPage(
      props().workspaceId,
      props().appId,
      { limit, statuses: JOB_FILTER_STATUSES[filter], text: search },
      props().enabled,
    ),
  );

  return {
    get filter() {
      return filter;
    },
    setFilter(next: JobFilterKey) {
      filter = next;
      limit = JOBS_STEP;
    },
    /** What the user typed. The list follows it after `SEARCH_DELAY_MS`. */
    get text() {
      return text;
    },
    setText(next: string) {
      text = next;
      clearTimeout(timer);
      timer = setTimeout(() => {
        search = next.trim();
        limit = JOBS_STEP;
      }, SEARCH_DELAY_MS);
    },
    get filtered() {
      return filter !== 'all' || !!search;
    },
    clear() {
      clearTimeout(timer);
      filter = 'all';
      text = '';
      search = '';
      limit = JOBS_STEP;
    },
    /** `undefined` while the first list loads. */
    get jobs() {
      return list.data?.jobs;
    },
    get more() {
      return list.data?.more ?? false;
    },
    /** A longer list or a new filter loads, and the last list stays on the screen. */
    get loading() {
      return list.isFetching && list.isPlaceholderData;
    },
    showMore() {
      limit += JOBS_STEP;
    },
  };
};

export type AgentJobs = ReturnType<typeof createAgentJobs>;
