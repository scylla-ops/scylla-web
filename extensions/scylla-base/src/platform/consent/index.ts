/**
 * The consent to the trackers that need it: the banner, the cookie settings, their entries, and
 * the loaders that wait for a yes. Hidden while each tracker of the registry is exempt.
 */
export {
  bannerNeeded,
  choiceHolds,
  consentAction,
  grantedPurposes,
  CHOICE_LIFETIME_DAYS,
  type ConsentAction,
  type ConsentChoice,
  type ConsentGrants,
  type ConsentSource,
  type ConsentState,
  type RecordConsentInput,
} from './domain/structs/consent-choice.struct.ts';
export { consentVersion } from './domain/structs/consent-version.struct.ts';
export type { ConsentRepository } from './domain/repository/consent.repository.ts';
export { withConsentRepository } from './consent-repository.ts';
export {
  CONSENT_STATE_QUERY_KEY,
  consentMutations,
  consentQueries,
} from './presentation/consent.queries.ts';
export { whenGranted } from './presentation/consent.loaders.ts';
export { consentMessages } from './presentation/messages/consent.messages.ts';
export {
  consentFrame,
  type ConsentFrame,
  type ConsentPurposeRow,
} from './presentation/presenters/consent.presenter.ts';
export { cookieSettings } from './presentation/ui/cookie-settings.state.svelte.ts';
export type { PolicyLink } from './presentation/ui/policy-link.ts';

/** The banner and the cookie settings, rendered once over each page while the frame is on. */
export const loadConsentOverlay = () =>
  import('./presentation/ui/ConsentOverlay/ConsentOverlay.svelte');
