import { msg } from '@lingui/core/macro';

export const passwordResetMessages = {
  forgotTitle: msg`Forgot password`,
  forgotDescription: msg`Enter the email of your account to get a link that resets the password.`,
  email: msg`Email`,
  emailPlaceholder: msg`name@example.com`,
  sendLink: msg`Send the link`,
  sentByMail: msg`If an account uses this email, we sent it a link to reset the password. The link expires in one hour.`,
  sentToServerLog: msg`If an account uses this email, the server wrote a reset link in its log. Ask your administrator for it.`,
  sentUnknown: msg`If an account uses this email, the server made a link to reset the password. The link expires in one hour.`,
  backToSignIn: msg`Back to sign in`,

  resetTitle: msg`Choose a new password`,
  resetDescription: msg`Enter the new password of your account.`,
  newPassword: msg`New password`,
  confirmPassword: msg`Confirm password`,
  changePassword: msg`Change the password`,
  resetDone: msg`Your password is changed.`,
  signIn: msg`Sign in`,
  invalidLink: msg`This link is not valid or has expired.`,
  newLink: msg`Get a new link`,
};
