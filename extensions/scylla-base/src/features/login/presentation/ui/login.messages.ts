import { msg } from '@lingui/core/macro';

export const loginMessages = {
  title: msg`Login to your account`,
  description: msg`Enter your username below to login to your account`,
  // Named after the field id, `identifier`: a contributor can turn this field into an email
  // input, so the key does not say "username".
  identifier: msg`Username`,
  identifierPlaceholder: msg`username`,
  password: msg`Password`,
  passwordPlaceholder: msg`••••••••`,
  submit: msg`Login`,
};
