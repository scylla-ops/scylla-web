/**
 * The status of a job, as `jobs` and `agents` show it. `unknown`: a state arm newer than this
 * build.
 */
export type JobStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'orphaned'
  /** A job from a fork waits for an editor of the project. No agent gets it. */
  | 'awaiting_approval'
  | 'unknown';

/** Still running: worth polling, and excluded from the success rate. */
export const isActiveStatus = (status: string): boolean =>
  status === 'pending' || status === 'running';

export const isFinishedStatus = (status: string): boolean =>
  status === 'completed' || status === 'failed' || status === 'cancelled' || status === 'orphaned';
