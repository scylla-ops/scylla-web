import { msg } from '@lingui/core/macro';

/** The texts of "Pipelines". */
export const pipelinesMessages = {
  failingFirst: msg({ context: 'pipelines', message: 'failing first' }),
  greenOf: (green: number, total: number) => msg({ context: 'pipelines', message: `${green} of ${total} green` }),
  ofGreen: (total: number) => msg({ context: 'pipelines', message: `of ${total} green` }),
  green: msg({ context: 'pipelines', message: 'green' }),
  red: msg({ context: 'pipelines', message: 'red' }),
  runningNow: msg({ context: 'pipelines', message: 'running now' }),
  pendingNow: msg({ context: 'pipelines', message: 'pending now' }),
  pipeline: msg({ context: 'pipelines', message: 'Pipeline' }),
  lastRuns: (count: number) => msg({ context: 'pipelines', message: `Last ${count} runs` }),
  success: msg({ context: 'pipelines', message: 'Success' }),
  median: msg({ context: 'pipelines', message: 'Median' }),
  seeAll: (count: number) => msg({ context: 'pipelines', message: `See all ${count}` }),
  allGreen: msg({ context: 'pipelines', message: 'No pipeline fails.' }),
};
