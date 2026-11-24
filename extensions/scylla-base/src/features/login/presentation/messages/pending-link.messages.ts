import { msg } from '@lingui/core/macro';

export const pendingLinkMessages = {
  title: msg`You already have an account`,
  description: (email: string, provider: string) =>
    msg`${email} already has a Scylla account with a password. To add ${provider} to it, enter the password of that account once.`,
  scyllaAccount: msg`Scylla account`,
  passwordOf: (email: string) => msg`Password of ${email}`,
  passwordPlaceholder: msg`Your Scylla password`,
  submit: (provider: string) => msg`Link ${provider} and sign in`,
  notMine: msg`This is not my account`,
  why: msg`A provider can send an email that the person does not own. So Scylla does not link by email alone. Scylla sends a mail to the person after the link.`,
  expiredTitle: msg`The sign-in request expired`,
  expired: msg`The request is older than 10 minutes, or it started in another browser. Start again from the first page.`,
  startAgain: msg`Start again`,
  unreachableTitle: msg`Scylla does not answer`,
  unreachable: msg`Your sign-in still waits. Try again in a moment.`,
  tryAgain: msg`Try again`,
};
