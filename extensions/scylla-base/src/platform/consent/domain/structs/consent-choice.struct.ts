import type { ConsentPurpose } from '@platform/trackers';

/** What the person did. */
export type ConsentAction = 'accept-all' | 'reject-all' | 'custom' | 'withdraw';

/** Where the person made the choice: the banner, the cookie settings, or the account page. */
export type ConsentSource = 'banner' | 'preferences' | 'account';

/** The purposes that a choice accepts (`true`) and refuses (`false`). */
export type ConsentGrants = Partial<Record<ConsentPurpose, boolean>>;

/** The choice that a browser keeps in its cookie `scylla_consent`. */
export interface ConsentChoice {
  /** The consent of this browser: the server gives it, and each record of its choices has it. */
  id: string;
  /** The version of the trackers that the person saw (`consentVersion`). */
  version: string;
  /** When the server recorded the choice, as an ISO date. */
  chosenAt: string;
  grants: ConsentGrants;
}

/** What the browser tells about the consent. */
export interface ConsentState {
  choice: ConsentChoice | null;
  /** The browser sends Global Privacy Control: a refusal of each purpose, with no banner. */
  globalPrivacyControl: boolean;
}

/** A new choice: the server records it, and the browser keeps it. */
export interface RecordConsentInput {
  /** The consent of this browser, or `null` for its first choice. */
  id: string | null;
  version: string;
  /** The text of the banner and of the purposes that the person saw: the server keeps its SHA-256. */
  text: string;
  /** One value for each purpose of the trackers that need consent. */
  grants: ConsentGrants;
  action: ConsentAction;
  source: ConsentSource;
}

/** A choice holds 6 months. Then the banner asks again. */
export const CHOICE_LIFETIME_DAYS = 180;

const DAY_MS = 86_400_000;

/** The choice holds: the person saw the same trackers, less than 6 months ago. */
export const choiceHolds = (
  choice: ConsentChoice | null,
  version: string,
  now: Date,
): choice is ConsentChoice =>
  choice !== null &&
  choice.version === version &&
  now.getTime() - Date.parse(choice.chosenAt) < CHOICE_LIFETIME_DAYS * DAY_MS;

/** The banner asks for a choice: no choice holds, and the browser does not refuse each purpose. */
export const bannerNeeded = (state: ConsentState, version: string, now: Date): boolean =>
  !state.globalPrivacyControl && !choiceHolds(state.choice, version, now);

/** The purposes that the person accepted: none with Global Privacy Control or with no choice. */
export const grantedPurposes = (
  state: ConsentState,
  version: string,
  now: Date,
): Set<ConsentPurpose> => {
  if (state.globalPrivacyControl || !choiceHolds(state.choice, version, now)) return new Set();
  const grants = Object.entries(state.choice.grants) as [ConsentPurpose, boolean][];
  return new Set(grants.filter(([, granted]) => granted).map(([purpose]) => purpose));
};

/**
 * The action of a new choice. A refusal of a purpose that the person accepted before is a
 * withdrawal: the server keeps it as a new record, after the record of the acceptance.
 */
export const consentAction = (
  grants: ConsentGrants,
  before: ReadonlySet<ConsentPurpose>,
): ConsentAction => {
  const values = Object.values(grants);
  if ([...before].some(purpose => grants[purpose] === false)) return 'withdraw';
  if (values.every(granted => granted)) return 'accept-all';
  if (values.every(granted => !granted)) return 'reject-all';
  return 'custom';
};
