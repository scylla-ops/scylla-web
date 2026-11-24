/** The state of something that runs, as the status components draw it. */
export type StatusState =
  | 'success'
  | 'failed'
  | 'running'
  | 'pending'
  | 'idle'
  | 'skipped'
  | 'cancelled'
  | 'orphaned';
