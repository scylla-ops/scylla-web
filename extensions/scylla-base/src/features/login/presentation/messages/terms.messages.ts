import { msg } from '@lingui/core/macro';

/**
 * The texts of the acceptance of the terms: the box of the sign-up form, the notice of the
 * providers and the terms step. A value named `terms` or `privacy` becomes a link
 * (`linked-text.presenter.ts`).
 */
export const termsMessages = {
  termsLink: msg`Terms of service`,
  privacyLink: msg`Privacy policy`,
  accept: (terms: string) => msg`I accept the ${terms}`,
  acceptVersion: (terms: string, version: string) => msg`I accept the ${terms}, version ${version}`,
  privacyNote: (privacy: string) =>
    msg`We use your data to create and run your account. See the ${privacy}.`,
  changedInForm: (version: string) =>
    msg`The terms changed while you filled in the form (version ${version}). Read them and tick the box again.`,
  changedInFormNoVersion: msg`The terms changed while you filled in the form. Read them and tick the box again.`,
  changed: (version: string) =>
    msg`The terms changed (version ${version}). Read them and tick the box again.`,
  changedNoVersion: msg`The terms changed. Read them and tick the box again.`,
  providersNotice: (terms: string, privacy: string) =>
    msg`By continuing, you agree to the ${terms} and acknowledge the ${privacy}.`,
  providersNoticeNoPrivacy: (terms: string) => msg`By continuing, you agree to the ${terms}.`,
  firstTitle: msg`One last step`,
  firstDescription: msg`Accept the terms of service to use your account.`,
  signedInAs: msg`Signed in as`,
  updateTitle: msg`New terms of service`,
  updateDescription: msg`The terms of service changed. Accept the new version to keep using your account.`,
  version: (version: string) => msg`Version ${version}`,
  effectiveOn: (date: string) => msg`Takes effect on ${date}`,
  whatChanges: msg`What changes`,
  readBefore: (terms: string, privacy: string) =>
    msg`Read the ${terms} and the ${privacy} before you accept.`,
  readBeforeNoPrivacy: (terms: string) => msg`Read the ${terms} before you accept.`,
  acceptAndContinue: msg`Accept and continue`,
  signOut: msg`Sign out`,
};
