import type { JobEvent, JobFilter } from '@base/features/jobs';

/** A whole number from 1: the server reads 0 as each pull request. */
const pullRequestOf = (text: string): number | undefined => {
  const value = text.trim();
  if (!/^\d+$/.test(value)) return undefined;
  const number = Number(value);
  return number > 0 ? number : undefined;
};

/** The filters of the jobs of a pipeline. A text field applies its value on change, not per key. */
export const createJobFilters = () => {
  let branch = $state('');
  let event = $state<JobEvent | null>(null);
  let author = $state('');
  let pullRequest = $state('');

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
      branch = next;
    },
    get event() {
      return event;
    },
    setEvent(next: JobEvent | null) {
      event = next;
    },
    get author() {
      return author;
    },
    setAuthor(next: string) {
      author = next;
    },
    get pullRequest() {
      return pullRequest;
    },
    setPullRequest(next: string) {
      pullRequest = next;
    },
    /** Only the fields that are set. */
    get filter() {
      return filter;
    },
    get active() {
      return Object.keys(filter).length > 0;
    },
    clear() {
      branch = '';
      event = null;
      author = '';
      pullRequest = '';
    },
  };
};

export type JobFilters = ReturnType<typeof createJobFilters>;
