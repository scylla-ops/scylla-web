import { msg } from '@lingui/core/macro';

export const signUpMessages = {
  title: msg`Create an account`,
  description: msg`Enter your name, your email and a password.`,
  displayName: msg`Name`,
  displayNamePlaceholder: msg`Ada Lovelace`,
  email: msg`Email`,
  emailPlaceholder: msg`name@example.com`,
  password: msg`Password`,
  confirmPassword: msg`Confirm the password`,
  submit: msg`Create the account`,
  sent: msg`We sent a link to this address. Open it to activate your account.`,
  haveAccount: msg`Already have an account? Sign in`,
  noAccount: msg`No account yet? Create one`,
  orContinueWith: msg`or`,
  continueWith: (provider: string) => msg`Continue with ${provider}`,
  verifyTitle: msg`Verify your email`,
  verifying: msg`Verifying your email address…`,
  verified: msg`Your email address is verified. You can sign in.`,
  invalidLink: msg`This link is not valid any more. Sign up again to get a new one.`,
  signIn: msg`Sign in`,
};
