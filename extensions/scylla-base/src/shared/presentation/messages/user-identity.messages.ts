import { msg } from '@lingui/core/macro';

export const userIdentityMessages = {
  deletedUser: msg`Deleted user`,
  unknownUser: msg`Unknown user`,
  agent: msg`Agent`,
  app: msg`App`,
  you: msg`You`,
};

export const removeIdentity = (name: string) => msg`Remove ${name}`;
