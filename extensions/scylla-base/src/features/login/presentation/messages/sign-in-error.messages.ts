import { msg } from '@lingui/core/macro';

export const signInErrorMessages = {
  theProvider: msg`the provider`,
  tryAgain: msg`Try again`,
  startAgain: msg`Start again`,
  backToSignIn: msg`Back to sign in`,
  backToAccount: msg`Back to your account`,
  accessDeniedTitle: msg`You stopped the sign-in`,
  accessDenied: (provider: string) => msg`You chose Cancel at ${provider}. Nothing changed.`,
  stateExpiredTitle: msg`The sign-in request expired`,
  stateExpired: msg`The request is older than 10 minutes, or it started in another browser. Start again from the first page.`,
  emailUnverifiedTitle: (provider: string) => msg`No verified email from ${provider}`,
  emailUnverified: (provider: string) =>
    msg`Add an email to your account at ${provider} and verify it. Then try again.`,
  signupDisabledTitle: msg`New accounts are not allowed here`,
  signupDisabled: (provider: string) =>
    msg`Sign-in with ${provider} is only for people who have an account. Ask an admin to add you first.`,
  emailInUseTitle: msg`You already have an account`,
  emailInUse: (provider: string) =>
    msg`An account uses this email. Sign in to it, then connect ${provider} on the Security page of your account.`,
  identityInUseTitle: (provider: string) => msg`This account at ${provider} is used by another person`,
  identityInUse: msg`It is linked to another Scylla account. Sign in to that account, or disconnect it there first.`,
  accountInactiveTitle: msg`Your account is turned off`,
  accountInactive: msg`An instance admin turned off your account. Ask them to turn it on again.`,
  redirectMismatchTitle: msg`The provider is not set up correctly`,
  redirectMismatch: (provider: string) =>
    msg`Tell your admin. The redirect URL of Scylla is not accepted at ${provider}.`,
  sessionRequiredTitle: msg`Sign in first`,
  sessionRequired: (provider: string) =>
    msg`To connect ${provider}, you must be signed in. Sign in, then start again from your account.`,
  providerRefusedTitle: (provider: string) => msg`The sign-in was refused at ${provider}`,
  providerRefused: msg`Try again. If it happens again, tell your admin.`,
  providerOffTitle: msg`This provider is not available`,
  providerOff: msg`An admin turned it off or removed it. Use another way to sign in.`,
  providerUnavailableTitle: (provider: string) => msg`Scylla cannot reach ${provider}`,
  providerUnavailable: msg`Nothing changed. Try again in a few minutes.`,
  invalidTokenTitle: (provider: string) => msg`The answer from ${provider} is not valid`,
  invalidToken: msg`Scylla checked the answer and did not accept it. Tell your admin.`,
  failedTitle: msg`The sign-in failed`,
  failed: msg`Something went wrong on the server. Try again in a few minutes.`,
};
