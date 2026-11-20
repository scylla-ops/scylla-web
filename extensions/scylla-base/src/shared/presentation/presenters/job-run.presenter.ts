import type { JobStatus } from '@shared/domain/structs/job-status.struct.ts';

/** A job that a run mark shows: the job it opens, and what its tooltip tells. */
export interface JobRun {
  id: string;
  status: JobStatus;
  /** The branch or the tag. */
  ref?: string;
  title?: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
}

/** The last 8 characters: the start of an id made from the time is the same for all jobs. */
export const jobShortId = (id: string): string => id.slice(-8);
