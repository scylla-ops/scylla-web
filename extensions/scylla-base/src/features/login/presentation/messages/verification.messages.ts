import { msg } from '@lingui/core/macro';

/** The texts of a new link to verify an email: on the sign-in, sign-up and verify pages. */
export const verificationMessages = {
  notVerified: msg`Your email address is not verified yet. Open the link in the mail that we sent you to activate your account.`,
  sender: (sender: string) =>
    msg`The mail comes from ${sender}. Not in your inbox? Look in your spam or junk folder.`,
  spam: msg`Not in your inbox? Look in your spam or junk folder.`,
  resend: msg`Send the link again`,
  resent: (email: string) => msg`We sent a new link to ${email}.`,
  resentIfPending: msg`If an account with this email waits for its check, we sent it a new link.`,
  limited: msg`Too many requests. Wait some minutes, then try again.`,
};
