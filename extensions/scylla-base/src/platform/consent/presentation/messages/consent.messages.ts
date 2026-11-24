import { msg } from '@lingui/core/macro';

export const consentMessages = {
  /** The entry of the footer, of the user menu and of the account page. */
  cookieSettings: msg`Cookie settings`,
  cookiePolicy: msg`Cookie policy`,

  bannerTitle: msg`Your choice about cookies`,
  bannerBody: msg`Scylla uses the cookies and the storage that the service needs. With your consent, it also uses trackers for the purposes below. You can change your choice at any time in the cookie settings.`,
  bannerPurposes: (purposes: string) => msg`Purposes: ${purposes}`,
  rejectAll: msg`Reject all`,
  customize: msg`Customize`,
  acceptAll: msg`Accept all`,

  preferencesDescription: msg`Choose the purposes that you accept. A purpose that you refuse loads no tracker. You can change your choice at any time.`,
  necessaryTitle: msg`Strictly necessary`,
  necessaryDescription: msg`The session, the security of the sign-in and your interface choices. The service needs them, so they are always on.`,
  alwaysOn: msg`Always on`,
  partners: (names: string) => msg`Partners: ${names}`,
  saveChoices: msg`Save my choices`,
  lastChoice: (date: string) => msg`Your last choice: ${date}`,
  noChoice: msg`You have not made a choice yet.`,
  globalPrivacyControl: msg`Your browser sends Global Privacy Control. Scylla takes it as a refusal of each purpose, so the trackers that need consent stay off.`,
  saved: msg`Your choice is saved.`,
};
