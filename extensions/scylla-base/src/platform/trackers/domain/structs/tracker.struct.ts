import type { MessageDescriptor } from '@lingui/core';

/** Where the browser keeps a tracker. */
export type TrackerType = 'cookie' | 'local-storage' | 'session-storage';

/**
 * A cookie or a key of the browser storage that the app reads or writes on the device of the
 * user. Each one has an entry in the registry: the cookie page shows the list, and a tracker
 * that is not exempt turns the consent banner on.
 */
export interface Tracker {
  /** The name of the cookie or of the key. A part in angle brackets changes: `onboarding:<userId>`. */
  name: string;
  type: TrackerType;
  /** Who sets it: `Scylla`, or the name of a third party. */
  provider: string;
  /** The file that writes it, from the folder of the repositories: `scylla-web/packages/…`. */
  owner: string;
  purpose: MessageDescriptor;
  lifetime: MessageDescriptor;
  /** Strictly necessary for the service that the user asked for: it needs no consent. */
  exempt: boolean;
}

/** The trackers that need the consent of the user. */
export const trackersNeedingConsent = (trackers: readonly Tracker[]): Tracker[] =>
  trackers.filter(tracker => !tracker.exempt);

/** The consent banner is on when one tracker is not exempt. */
export const consentBannerNeeded = (trackers: readonly Tracker[]): boolean =>
  trackersNeedingConsent(trackers).length > 0;

/** The part of a name that does not change: the text before the first angle bracket. */
export const fixedNamePart = (name: string): string => name.split('<')[0] ?? '';
