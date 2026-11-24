import { msg } from '@lingui/core/macro';

/** The texts of "Quick actions" that the first set did not have. */
export const quickActionMessages = {
  fireTrigger: msg({ context: 'quick actions', message: 'Fire a trigger' }),
  addSecret: msg({ context: 'quick actions', message: 'Add a secret' }),
  noTrigger: msg({ context: 'quick actions', message: 'No cron trigger yet' }),
};
