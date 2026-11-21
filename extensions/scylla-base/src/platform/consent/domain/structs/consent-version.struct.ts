import type { TrackerNeedingConsent } from '@platform/trackers';

/** FNV-1a on 32 bits: a short hash that does not need a secure context. */
const OFFSET = 0x81_1c_9d_c5;
const PRIME = 0x01_00_01_93;

/**
 * The version of the banner: a short hash of the trackers that need consent. A new tracker, a
 * new provider or a new purpose gives a new version, and the banner asks again.
 */
export const consentVersion = (trackers: readonly TrackerNeedingConsent[]): string => {
  const text = trackers
    .map(tracker => `${tracker.consent}:${tracker.provider}:${tracker.type}:${tracker.name}`)
    .sort()
    .join('\n');
  let hash = OFFSET;
  for (const character of text) {
    hash = Math.imul(hash ^ (character.codePointAt(0) ?? 0), PRIME) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
};
