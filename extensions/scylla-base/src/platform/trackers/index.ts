/**
 * The tracker registry: each cookie and each key of the browser storage that the app uses, with
 * its purpose, its lifetime and whether it needs consent. The cookie page shows it, and a tracker
 * that needs consent turns the consent framework on (`@platform/consent`).
 */
export { CONSENT_PURPOSES, type ConsentPurpose } from './domain/structs/consent-purpose.struct.ts';
export {
  consentBannerNeeded,
  fixedNamePart,
  purposesNeedingConsent,
  trackersNeedingConsent,
  type Tracker,
  type TrackerNeedingConsent,
  type TrackerType,
} from './domain/structs/tracker.struct.ts';
export { registeredTrackers, trackersPoints } from './presentation/trackers.points.ts';
export {
  consentPurposeDescriptions,
  consentPurposeTitles,
  trackerTypes,
  trackersMessages,
} from './presentation/messages/trackers.messages.ts';
export { SCYLLA_TRACKERS } from './presentation/ui/trackers.registry.ts';
export { default as TrackerTable } from './presentation/ui/TrackerTable/TrackerTable.svelte';
