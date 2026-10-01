import { msg } from '@lingui/core/macro';

export const loginMessages = {
  title: msg`Login to your account`,
  description: msg`Enter your username below to login to your account`,
  // Named after the field, not "username": once `loginPoints.fields` exports its id, "username"
  // would be wrong for a field a contributor has turned into an email input. The msgids below
  // are unchanged, so `pnpm extract` keeps the French translations.
  identifier: msg`Username`,
  identifierPlaceholder: msg`username`,
  password: msg`Password`,
  passwordPlaceholder: msg`••••••••`,
  submit: msg`Login`,
};
