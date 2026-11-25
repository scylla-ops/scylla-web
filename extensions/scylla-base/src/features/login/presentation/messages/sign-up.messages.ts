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
  sent: (email: string) => msg`We sent a link to ${email}. Open it to activate your account.`,
  haveAccount: msg`Already have an account? Sign in`,
  noAccount: msg`No account yet? Create one`,
  orContinueWith: msg`or`,
  continueWith: (provider: string) => msg`Continue with ${provider}`,
  verifyTitle: msg`Verify your email`,
  verifying: msg`Verifying your email address…`,
  verified: msg`Your email address is verified. You can sign in.`,
  invalidLink: msg`This link is not valid any more. If your account is not active yet, enter your email to get a new link.`,
  signIn: msg`Sign in`,
};
