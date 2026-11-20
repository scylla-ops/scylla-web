import { msg } from '@lingui/core/macro';

/** The texts of "Run duration". */
export const durationMessages = {
  p50: msg({ context: 'duration', message: 'p50' }),
  p95: msg({ context: 'duration', message: 'p95' }),
  p50Median: msg({ context: 'duration', message: 'p50 · median' }),
  p50AndP95: (period: string) => msg({ context: 'duration', message: `p50 and p95 · ${period}` }),
  p50p95: (p95: string) => msg({ context: 'duration', message: `p50 · p95 ${p95}` }),
  legendMedian: msg({ context: 'duration', message: 'p50 (median)' }),
  legendUpTo: msg({ context: 'duration', message: 'up to p95' }),
  slowest: msg({ context: 'duration', message: 'Slowest pipelines' }),
  p50Change: msg({ context: 'duration', message: 'p50 · change' }),
};
