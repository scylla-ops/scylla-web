import { msg } from '@lingui/core/macro';

export const loginMessages = {
  title: msg`Sign in`,
  description: msg`Enter your email or username, and your password.`,
  // Named after the field id, `identifier`: a contributor can turn this field into an email
  // input, so the key does not say "username". Override `description` with it.
  identifier: msg`Email or username`,
  identifierPlaceholder: msg`name@example.com or username`,
  password: msg`Password`,
  passwordPlaceholder: msg`••••••••`,
  submit: msg`Sign in`,
  forgotPassword: msg`Forgot password?`,
};
