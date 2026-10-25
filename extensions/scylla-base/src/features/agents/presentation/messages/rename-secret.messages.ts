import { msg } from '@lingui/core/macro';

export const renameSecretMessages = {
  rename: msg`Rename`,
  title: (label: string) => msg`Rename “${label}”`,
  description: msg`Only the name changes. The secret, its tokens and the connection of the agent stay.`,
  name: msg`Name`,
  nameHelp: msg`Unique for this agent. Use the machine name, so you know where the secret is.`,
  cancel: msg`Cancel`,
  save: msg`Rename`,
};
