import type { StatusState } from '../status-state.ts';

export interface StatusTrailItem {
  id: string;
  state: StatusState;
  /** The accessible name of the dot: a dot has no text. */
  label: string;
  /** Renders the dot as a button. */
  onSelect?: () => void;
}

/**
 * The dot of each state. A state with no result yet (waiting, skipped) is a ring; the others
 * are filled. A `Record`, so that a new state fails to compile here.
 */
const DOT_CLASS: Record<StatusState, string> = {
  success: 'bg-status-passed',
  failed: 'bg-status-failed',
  running: 'bg-status-running animate-pulse',
  pending: 'border-[1.5px] border-status-queued',
  idle: 'border-[1.5px] border-muted-foreground/60',
  skipped: 'border-[1.5px] border-status-skipped',
  cancelled: 'bg-status-canceled',
  orphaned: 'bg-status-canceled',
};

export const trailDotClass = (state: StatusState): string => DOT_CLASS[state] ?? DOT_CLASS.idle;

/** A link takes the color of success only after a success: the trail is green while it holds. */
export const isLinkLit = (from: StatusState): boolean => from === 'success';
