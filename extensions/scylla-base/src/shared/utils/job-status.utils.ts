import type { StatusState } from '@scylla/ui';

/**
 * The shape of each status of a job or of a node, as the server gives it. A job that waits, for
 * an agent or for an approval, is `pending`: never `running`.
 */
const JOB_STATUS_MAP: Record<string, StatusState> = {
  pending: 'pending',
  awaiting_approval: 'pending',
  running: 'running',
  completed: 'success',
  success: 'success',
  failed: 'failed',
  skipped: 'skipped',
  cancelled: 'cancelled',
  orphaned: 'orphaned',
};

/** Falls back to `idle`. */
export const toStatusState = (status?: string): StatusState =>
  status ? JOB_STATUS_MAP[status.toLowerCase()] || 'idle' : 'idle';
