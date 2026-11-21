import {
  consentPurposeDescriptions,
  consentPurposeTitles,
  purposesNeedingConsent,
  registeredTrackers,
  trackersNeedingConsent,
  type ConsentPurpose,
  type Tracker,
  type TrackerNeedingConsent,
} from '@platform/trackers';
import { t } from '@scylla/ui/i18n';
import type { ConsentChoice, ConsentGrants } from '../../domain/structs/consent-choice.struct.ts';
import { consentVersion } from '../../domain/structs/consent-version.struct.ts';
import { formatDate } from '@shared/utils/date-utils.ts';
import { consentMessages as messages } from '../messages/consent.messages.ts';

/** What the consent framework works with: off, and hidden, while each tracker is exempt. */
export interface ConsentFrame {
  /** One tracker needs consent: the banner, the cookie settings and their entries show. */
  on: boolean;
  /** The version of the banner: it changes with the trackers that need consent. */
  version: string;
  /** The purposes of these trackers, in their order. */
  purposes: ConsentPurpose[];
  trackers: TrackerNeedingConsent[];
}

/** One row of the cookie settings. */
export interface ConsentPurposeRow {
  purpose: ConsentPurpose;
  title: string;
  description: string;
  /** The providers of the trackers of the purpose. */
  partners: string[];
}

/** The frame of the tracker registry: the trackers of Scylla and of the extensions. */
export const consentFrame = (trackers: readonly Tracker[] = registeredTrackers()): ConsentFrame => {
  const needing = trackersNeedingConsent(trackers);
  return {
    on: needing.length > 0,
    version: consentVersion(needing),
    purposes: purposesNeedingConsent(trackers),
    trackers: needing,
  };
};

/** One row for each purpose, with its partners. */
export const purposeRows = (frame: ConsentFrame): ConsentPurposeRow[] =>
  frame.purposes.map(purpose => ({
    purpose,
    title: t(consentPurposeTitles[purpose]),
    description: t(consentPurposeDescriptions[purpose]),
    partners: [
      ...new Set(
        frame.trackers
          .filter(tracker => tracker.consent === purpose)
          .map(tracker => tracker.provider),
      ),
    ],
  }));

/** The same value for each purpose of the frame. */
export const allPurposes = (frame: ConsentFrame, granted: boolean): ConsentGrants =>
  Object.fromEntries(frame.purposes.map(purpose => [purpose, granted]));

/** The text that the person saw, in its language: the server keeps its SHA-256 with the record. */
export const consentText = (rows: readonly ConsentPurposeRow[]): string =>
  [
    t(messages.bannerTitle),
    t(messages.bannerBody),
    ...rows.map(
      row => `${row.title}: ${row.description} ${t(messages.partners(row.partners.join(', ')))}`,
    ),
  ].join('\n');

/** The line of the last choice, in the cookie settings. */
export const lastChoiceText = (choice: ConsentChoice | null): string =>
  choice ? t(messages.lastChoice(formatDate(choice.chosenAt))) : t(messages.noChoice);
