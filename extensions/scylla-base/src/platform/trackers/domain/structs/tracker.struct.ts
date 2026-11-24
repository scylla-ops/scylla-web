import type { MessageDescriptor } from '@lingui/core';
import { CONSENT_PURPOSES, type ConsentPurpose } from './consent-purpose.struct.ts';

/** Where the browser keeps a tracker. */
export type TrackerType = 'cookie' | 'local-storage' | 'session-storage';

/** What the registry tells about each tracker. */
interface TrackerFacts {
  /** The name of the cookie or of the key. A part in angle brackets changes: `onboarding:<userId>`. */
  name: string;
  type: TrackerType;
  /** Who sets it: `Scylla`, or the name of a third party. */
  provider: string;
  /** The file that writes it, from the folder of the repositories: `scylla-web/packages/…`. */
  owner: string;
  purpose: MessageDescriptor;
  lifetime: MessageDescriptor;
}

/**
 * A cookie or a key of the browser storage that the app reads or writes on the device of the
 * user. Each one has an entry in the registry: the cookie page shows the list. A tracker that is
 * not exempt names the purpose that the person accepts or refuses, and turns the consent
 * framework on: the banner, the cookie settings and their entries.
 */
export type Tracker = TrackerFacts &
  (
    | {
        /** Strictly necessary for the service that the user asked for: it needs no consent. */
        exempt: true;
      }
    | {
        exempt: false;
        /** The purpose that the person accepts or refuses. Load the tracker only after a yes. */
        consent: ConsentPurpose;
      }
  );

/** A tracker that needs the consent of the user. */
export type TrackerNeedingConsent = Extract<Tracker, { exempt: false }>;

/** The trackers that need the consent of the user. */
export const trackersNeedingConsent = (trackers: readonly Tracker[]): TrackerNeedingConsent[] =>
  trackers.filter((tracker): tracker is TrackerNeedingConsent => !tracker.exempt);

/** The consent framework is on when one tracker is not exempt. */
export const consentBannerNeeded = (trackers: readonly Tracker[]): boolean =>
  trackersNeedingConsent(trackers).length > 0;

/** The purposes of the trackers that need consent, in the order of `CONSENT_PURPOSES`. */
export const purposesNeedingConsent = (trackers: readonly Tracker[]): ConsentPurpose[] => {
  const used = new Set(trackersNeedingConsent(trackers).map(tracker => tracker.consent));
  return CONSENT_PURPOSES.filter(purpose => used.has(purpose));
};

/** The part of a name that does not change: the text before the first angle bracket. */
export const fixedNamePart = (name: string): string => name.split('<')[0] ?? '';
