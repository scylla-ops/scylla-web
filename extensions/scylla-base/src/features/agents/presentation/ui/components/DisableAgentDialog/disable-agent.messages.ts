import { msg } from '@lingui/core/macro';

export const disableAgentMessages = {
  title: (name: string) => msg`Disable ${name}?`,
  body: msg`It disconnects at once and cannot sign in until you enable it again.`,
  backToQueue: msg`Jobs placed on it that have not started go back to the queue.`,
  canOrphan: msg`A job that runs now can end as orphaned.`,
  keepsGrants: msg`Its secrets and grants stay. Enable it to restore them.`,
  cancel: msg`Cancel`,
  confirm: msg`Disable agent`,
};
