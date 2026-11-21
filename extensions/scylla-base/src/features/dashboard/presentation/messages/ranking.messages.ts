import { msg } from '@lingui/core/macro';

export const rankingMessages = {
  slowest: msg({ context: 'ranking', message: 'Slowest pipelines' }),
  failing: msg({ context: 'ranking', message: 'Most failures' }),
  p50: msg({ context: 'ranking', message: 'p50' }),
  p50Of: (period: string) => msg({ context: 'ranking', message: `p50 · ${period}` }),
  failed: msg({ context: 'ranking', message: 'failed' }),
  failedOf: (period: string) => msg({ context: 'ranking', message: `failed jobs · ${period}` }),
  pipelines: (count: number) => msg({ context: 'ranking', message: `${count} pipelines` }),
  empty: msg({ context: 'ranking', message: 'No pipeline to rank' }),
  emptyText: msg({ context: 'ranking', message: 'No job of a pipeline ended in this period.' }),
  noFailure: msg({ context: 'ranking', message: 'No failure' }),
  noFailureText: msg({ context: 'ranking', message: 'No job of a pipeline failed in this period.' }),
};
