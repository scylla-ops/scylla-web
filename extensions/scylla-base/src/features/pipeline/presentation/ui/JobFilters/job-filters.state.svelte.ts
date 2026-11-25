import { createSearchParams } from '@platform/context';
import type { JobEvent, JobFilter } from '@base/features/jobs';
import { JOB_EVENTS } from '@base/features/pipeline/presentation/presenters/job-filter.presenter.ts';

/** A whole number from 1: the server reads 0 as each pull request. */
const pullRequestOf = (text: string): number | undefined => {
  const value = text.trim();
  if (!/^\d+$/.test(value)) return undefined;
  const number = Number(value);
  return number > 0 ? number : undefined;
};

/**
 * The filters of the jobs of a pipeline. They are in the URL (`?branch=&event=&author=&pr=`), so
 * that a copied link opens the same list. A text field applies its value on change, not per key.
 */
export const createJobFilters = () => {
  const search = createSearchParams(['branch', 'event', 'author', 'pr']);

  const branch = $derived(search.values.branch);
  const event = $derived(JOB_EVENTS.find(known => known === search.values.event) ?? null);
  const author = $derived(search.values.author);
  const pullRequest = $derived(search.values.pr);

  const filter = $derived.by<JobFilter>(() => {
    const login = author.trim();
    const number = pullRequestOf(pullRequest);
    return {
      ...(branch && { branch }),
      ...(event && { event }),
      ...(login && { authorLogin: login }),
      ...(number && { pullRequest: number }),
    };
  });

  return {
    get branch() {
      return branch;
    },
    setBranch(next: string) {
      search.write({ branch: next });
    },
    get event() {
      return event;
    },
    setEvent(next: JobEvent | null) {
      search.write({ event: next ?? '' });
    },
    get author() {
      return author;
    },
    setAuthor(next: string) {
      search.write({ author: next });
    },
    get pullRequest() {
      return pullRequest;
    },
    setPullRequest(next: string) {
      search.write({ pr: next });
    },
    /** Only the fields that are set. */
    get filter() {
      return filter;
    },
    get active() {
      return Object.keys(filter).length > 0;
    },
    clear() {
      search.write({ branch: '', event: '', author: '', pr: '' });
    },
  };
};

export type JobFilters = ReturnType<typeof createJobFilters>;
