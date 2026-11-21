import type { ConsentPurpose } from '@platform/trackers';
import { consentRepository } from '../consent-repository.ts';
import { grantedPurposes } from '../domain/structs/consent-choice.struct.ts';
import { consentFrame } from './presenters/consent.presenter.ts';

/** The loaders that wait for the consent of their purpose. */
const waiting = new Map<ConsentPurpose, (() => void)[]>();

/** The purposes whose loaders ran in this page. */
const loaded = new Set<ConsentPurpose>();

/**
 * Runs the loaders of the accepted purposes, once each. Gives the purposes whose loaders ran and
 * that the choice refuses now: their scripts stay in the page until the next load of the page.
 */
export const applyGrants = (granted: ReadonlySet<ConsentPurpose>): ConsentPurpose[] => {
  for (const purpose of granted) {
    const loads = waiting.get(purpose) ?? [];
    waiting.delete(purpose);
    if (loads.length > 0) loaded.add(purpose);
    loads.forEach(load => load());
  }
  return [...loaded].filter(purpose => !granted.has(purpose));
};

/**
 * Runs `load` when the person accepts `purpose`: at once when the choice of this browser accepts
 * it, else after a later choice. With Global Privacy Control, never. The only way to load the
 * script of a tracker that needs consent.
 */
export const whenGranted = async (purpose: ConsentPurpose, load: () => void): Promise<void> => {
  waiting.set(purpose, [...(waiting.get(purpose) ?? []), load]);
  const state = await consentRepository().state();
  applyGrants(grantedPurposes(state, consentFrame().version, new Date()));
};

/** For a test: forgets the loaders. */
export const resetLoaders = (): void => {
  waiting.clear();
  loaded.clear();
};
