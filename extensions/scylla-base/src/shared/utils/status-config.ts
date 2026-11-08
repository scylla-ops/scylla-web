import { msg } from '@lingui/core/macro';
import type { MessageDescriptor } from '@lingui/core';

export type StatusKey =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'cancelled'
  | 'orphaned'
  | 'unknown';

export interface StatusConfig {
  /** A descriptor: this table is built at import time. */
  label: MessageDescriptor;
  /** Classes for a `<Badge variant='outline'>`: the Badge variants cannot tell the statuses apart. */
  badgeClassName: string;
  barClassName: string;
  barHoverClassName: string;
  textClassName: string;
}

export const STATUS_CONFIG: Record<StatusKey, StatusConfig> = {
  running: {
    label: msg`Running`,
    badgeClassName: 'bg-status-running/15 border-status-running/30 text-status-running',
    barClassName: 'bg-status-running/80 animate-[smooth-pulse_2s_infinite]',
    barHoverClassName: 'ring-4 ring-status-running/30 ring-inset hover:scale-y-110',
    textClassName: 'text-status-running',
  },

  pending: {
    label: msg`Pending`,
    badgeClassName: 'bg-status-queued/15 border-status-queued/30 text-status-queued',
    barClassName: 'bg-status-queued/40',
    barHoverClassName: 'hover:bg-status-queued/70 hover:scale-y-110',
    textClassName: 'text-status-queued',
  },
  completed: {
    label: msg`Success`,
    badgeClassName: 'bg-status-passed/15 border-status-passed/30 text-status-passed',
    barClassName: 'bg-status-passed',
    barHoverClassName: 'hover:bg-status-passed/80 hover:scale-y-110',
    textClassName: 'text-status-passed',
  },
  failed: {
    label: msg`Failed`,
    badgeClassName: 'bg-status-failed/15 border-status-failed/30 text-status-failed',
    barClassName: 'bg-status-failed/80',
    barHoverClassName: 'hover:bg-status-failed hover:scale-y-110',
    textClassName: 'text-status-failed',
  },
  skipped: {
    label: msg`Skipped`,
    badgeClassName: 'bg-status-skipped/15 border-status-skipped/30 text-status-skipped',
    barClassName: 'bg-status-skipped/35',
    barHoverClassName: 'hover:bg-status-skipped/60 hover:scale-y-110',
    textClassName: 'text-status-skipped',
  },
  orphaned: {
    label: msg`Orphaned`,
    badgeClassName: 'bg-status-canceled/15 border-status-canceled/30 text-status-canceled',
    barClassName: 'bg-status-canceled/80',
    barHoverClassName: 'hover:bg-status-canceled hover:scale-y-110',
    textClassName: 'text-status-canceled',
  },
  cancelled: {
    label: msg`Cancelled`,
    badgeClassName: 'bg-status-canceled/15 border-status-canceled/30 text-status-canceled',
    barClassName: 'bg-status-canceled/60',
    barHoverClassName: 'hover:bg-status-canceled/90 hover:scale-y-110',
    textClassName: 'text-status-canceled',
  },
  // A state this build does not know: shown as it is.
  unknown: {
    label: msg`Unknown`,
    badgeClassName: 'bg-muted-foreground/15 border-muted-foreground/30 text-muted-foreground',
    barClassName: 'bg-muted-foreground/15',
    barHoverClassName: 'hover:bg-muted-foreground/40 hover:scale-y-110',
    textClassName: 'text-muted-foreground',
  },
};

/** Falls back to `pending`. */
export const getStatusConfig = (status: string): StatusConfig =>
  STATUS_CONFIG[status as StatusKey] ?? STATUS_CONFIG.pending;
