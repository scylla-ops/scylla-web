import { msg } from '@lingui/core/macro';

/** The section Privacy of the account page, and the facts of the deletion of an account. */
export const privacyMessages = {
  navTitle: msg`Privacy`,
  keywords: msg`personal data export download cookies gdpr`,

  yourData: msg`Your data`,
  yourDataDescription: msg`Get a copy of the data of your account, in a format that other tools can read.`,
  noExport: msg`No export yet`,
  exportContents: msg`One JSON file: your profile, emails, sign-in methods, sessions, tokens (never a secret), settings, accepted terms, workspaces and roles.`,
  downloadMyData: msg`Download my data`,
  preparing: msg`Preparing your file`,
  preparingText: msg`This takes a few seconds. Stay on this page.`,
  preparingButton: msg`Preparing…`,
  ready: msg`Your file is ready`,
  readyText: (name: string, size: string, date: string) => msg`${name} · ${size} · Made on ${date}`,
  newExport: msg`New export`,
  download: msg`Download`,
  failed: msg`The export failed`,
  failedText: msg`The server could not make the copy. Try again.`,
  tryAgain: msg`Try again`,

  terms: msg`Terms`,
  termsDescription: msg`The version of the terms of service that you accepted.`,
  termsOfService: msg`Terms of service`,
  termsOfServiceVersion: (version: string) => msg`Terms of service · version ${version}`,
  acceptedOn: (date: string) => msg`Accepted on ${date}`,
  readTerms: msg`Read`,

  privacyPolicy: msg`Privacy policy`,
  privacyPolicyDescription: msg`How the operator of this server uses the data of your account.`,
  readPrivacyPolicy: msg`Read the privacy policy`,

  cookies: msg`Cookies and storage`,
  cookiesDescription: msg`What this app keeps in your browser, and why.`,
  seeStorage: msg`See what this app keeps in your browser`,

  deleteHint: msg`To delete your account and your personal data, go to the`,

  deleteWarning: msg`You cannot undo this. Enter your password to confirm.`,
  deletedAtOnce: msg`Deleted at once`,
  deletedProfile: msg`Your profile, your emails and your password`,
  deletedSignIn: msg`Your sign-in methods and your sessions`,
  deletedTokens: msg`Your personal tokens and your roles`,
  deletedWorkspaces: msg`The empty workspaces that you own alone`,
  whatStays: msg`What stays`,
  staysShared: msg`The workspaces that you share stay with their other owners`,
  staysWork: msg`The work that you did in a workspace stays in that workspace`,
  staysTermsProof: msg`The proof that you accepted the terms (account id, a hash of your email, version, method and date) stays for 5 years after the deletion`,
  downloadFirst: msg`Download my data first`,
};
