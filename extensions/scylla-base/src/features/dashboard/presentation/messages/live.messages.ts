import { msg } from '@lingui/core/macro';

/** The texts of "Right now". */
export const liveMessages = {
  live: msg({ context: 'live', message: 'live' }),
  running: msg({ context: 'live', message: 'running' }),
  waiting: msg({ context: 'live', message: 'waiting' }),
  runningSection: (count: number) => msg({ context: 'live', message: `Running · ${count}` }),
  waitingSection: (count: number) => msg({ context: 'live', message: `Waiting · ${count}` }),
  elapsedMedian: msg({ context: 'live', message: 'elapsed · median' }),
  elapsedMedianLong: msg({ context: 'live', message: 'elapsed · median of the pipeline' }),
  waits: msg({ context: 'live', message: 'waits' }),
  reasonAgent: msg({ context: 'live', message: 'agent' }),
  reasonApproval: msg({ context: 'live', message: 'approval' }),
  waitsForAgent: msg({ context: 'live', message: 'waits for a free agent' }),
  waitsForApproval: msg({ context: 'live', message: 'waits for an approval' }),
  attempt: (attempt: number) => msg({ context: 'live', message: `attempt ${attempt}` }),
  attemptOf: (attempt: number, max: number) => msg({ context: 'live', message: `attempt ${attempt} of ${max}` }),
  cancel: msg({ context: 'live', message: 'Cancel' }),
  review: msg({ context: 'live', message: 'Review' }),
  nothingRuns: msg({ context: 'live', message: 'Nothing runs now.' }),
  nothingWaits: msg({ context: 'live', message: 'Nothing waits.' }),
};
