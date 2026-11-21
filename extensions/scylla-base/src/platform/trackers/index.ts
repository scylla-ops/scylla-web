/**
 * The tracker registry: each cookie and each key of the browser storage that the app uses, with
 * its purpose, its lifetime and whether it needs consent. The cookie page shows it.
 */
export {
  consentBannerNeeded,
  fixedNamePart,
  trackersNeedingConsent,
  type Tracker,
  type TrackerType,
} from './domain/structs/tracker.struct.ts';
export { registeredTrackers, trackersPoints } from './presentation/trackers.points.ts';
export { trackerTypes, trackersMessages } from './presentation/messages/trackers.messages.ts';
export { SCYLLA_TRACKERS } from './presentation/ui/trackers.registry.ts';
export { default as TrackerTable } from './presentation/ui/TrackerTable/TrackerTable.svelte';
