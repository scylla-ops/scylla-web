export type ChartDeltaDirection = 'up' | 'down' | 'flat';

export type ChartDeltaTone = 'good' | 'bad' | 'neutral';

export interface ChartDeltaTrend {
  direction: ChartDeltaDirection;
  tone: ChartDeltaTone;
}

/**
 * The direction and the tone of a change against the previous period. `better` tells which
 * direction is good: `up` for a success rate, `down` for a duration. A change of 0 is flat.
 */
export const deltaTrend = (change: number, better: 'up' | 'down'): ChartDeltaTrend => {
  if (change === 0 || !Number.isFinite(change)) return { direction: 'flat', tone: 'neutral' };
  const direction = change > 0 ? 'up' : 'down';
  return { direction, tone: direction === better ? 'good' : 'bad' };
};

export const CHART_DELTA_TONE: Readonly<Record<ChartDeltaTone, string>> = {
  good: 'bg-status-passed/15 text-status-passed',
  bad: 'bg-status-failed/15 text-status-failed',
  neutral: 'bg-muted text-muted-foreground',
};
