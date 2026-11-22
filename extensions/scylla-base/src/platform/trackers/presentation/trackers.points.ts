import { point } from '@scylla/core-sdk';
import type { Tracker } from '../domain/structs/tracker.struct.ts';
import { SCYLLA_TRACKERS } from './ui/trackers.registry.ts';

/**
 * Listed in `LegalModule.points`: the loader names it `legal.trackers`. An extension that writes
 * a cookie or a key of the browser storage adds its entry with a patch.
 */
export const trackersPoints = {
  trackers: point.value<readonly Tracker[]>(),
};

/** Each tracker of the app: the trackers of Scylla, then the trackers of the extensions. */
export const registeredTrackers = (): readonly Tracker[] =>
  trackersPoints.trackers.resolve(SCYLLA_TRACKERS);
