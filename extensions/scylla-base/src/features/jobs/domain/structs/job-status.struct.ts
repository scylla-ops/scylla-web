/** `unknown`: a state arm newer than this build. */
export type JobStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'orphaned'
  | 'unknown';

/** Still running: worth polling, and excluded from the success rate. */
export const isActiveStatus = (status: string): boolean =>
  status === 'pending' || status === 'running';

export const isFinishedStatus = (status: string): boolean =>
  status === 'completed' || status === 'failed' || status === 'cancelled' || status === 'orphaned';
