/** The colors of a mark: the states of a run, then the colors of the theme. */
export type ChartTone =
  | 'passed'
  | 'failed'
  | 'running'
  | 'queued'
  | 'canceled'
  | 'skipped'
  | 'primary'
  | 'info'
  | 'warning'
  | 'muted';

export const CHART_TONE_FILL: Readonly<Record<ChartTone, string>> = {
  passed: 'bg-status-passed',
  failed: 'bg-status-failed',
  running: 'bg-status-running',
  queued: 'bg-status-queued',
  canceled: 'bg-status-canceled',
  skipped: 'bg-status-skipped',
  primary: 'bg-primary',
  info: 'bg-info',
  warning: 'bg-warning',
  muted: 'bg-muted',
};

/** The same colors for an SVG stroke. */
export const CHART_TONE_STROKE: Readonly<Record<ChartTone, string>> = {
  passed: 'stroke-status-passed',
  failed: 'stroke-status-failed',
  running: 'stroke-status-running',
  queued: 'stroke-status-queued',
  canceled: 'stroke-status-canceled',
  skipped: 'stroke-status-skipped',
  primary: 'stroke-primary',
  info: 'stroke-info',
  warning: 'stroke-warning',
  muted: 'stroke-muted',
};
