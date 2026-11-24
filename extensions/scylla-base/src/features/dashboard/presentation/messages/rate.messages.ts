import { msg } from '@lingui/core/macro';

/** The texts of "Success rate" and "Run duration". */
export const rateMessages = {
  cancelledApart: (count: number) => msg({ context: 'rate', message: `${count} cancelled, not counted` }),
  vsPrevious: (period: string) => msg({ context: 'rate', message: `vs the previous ${period}` }),
  mostFailures: msg({ context: 'rate', message: 'Most failures' }),
  failedOrphaned: msg({ context: 'rate', message: 'failed + orphaned' }),
};
