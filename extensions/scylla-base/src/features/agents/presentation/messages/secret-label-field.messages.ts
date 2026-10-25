import { msg } from '@lingui/core/macro';

export const secretLabelFieldMessages = {
  empty: msg`Enter a name for the secret.`,
  tooLong: msg`The name is too long: 64 bytes at most. An accented letter counts as 2, some characters count as 3 or 4.`,
  control: msg`Remove the invisible control characters (for example a tab or a line break).`,
  taken: msg`Another secret of this agent has this name.`,
};
