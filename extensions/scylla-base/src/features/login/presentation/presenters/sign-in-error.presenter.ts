import type { MessageDescriptor } from '@lingui/core';
import { signInErrorMessages as m } from '@base/features/login/presentation/messages/sign-in-error.messages.ts';

export type SignInErrorTone = 'info' | 'warning' | 'blocked' | 'locked';

/** What the page offers: the start at the provider, the first page again, or only the way back. */
export type SignInErrorAction = 'retry' | 'start-again' | 'none';

export interface SignInErrorCard {
  /** The code for an admin. It is always a code of this list, never the text of the URL. */
  code: string;
  title: MessageDescriptor;
  body: MessageDescriptor;
  tone: SignInErrorTone;
  action: SignInErrorAction;
}

type Card = Omit<SignInErrorCard, 'code'>;

const cards = (provider: string): Record<string, Card> => ({
  access_denied: {
    title: m.accessDeniedTitle,
    body: m.accessDenied(provider),
    tone: 'info',
    action: 'retry',
  },
  state_expired: {
    title: m.stateExpiredTitle,
    body: m.stateExpired,
    tone: 'warning',
    action: 'start-again',
  },
  email_unverified: {
    title: m.emailUnverifiedTitle(provider),
    body: m.emailUnverified(provider),
    tone: 'warning',
    action: 'retry',
  },
  signup_disabled: {
    title: m.signupDisabledTitle,
    body: m.signupDisabled(provider),
    tone: 'locked',
    action: 'none',
  },
  email_in_use: {
    title: m.emailInUseTitle,
    body: m.emailInUse(provider),
    tone: 'info',
    action: 'none',
  },
  identity_in_use: {
    title: m.identityInUseTitle(provider),
    body: m.identityInUse,
    tone: 'blocked',
    action: 'none',
  },
  account_inactive: {
    title: m.accountInactiveTitle,
    body: m.accountInactive,
    tone: 'locked',
    action: 'none',
  },
  redirect_uri_mismatch: {
    title: m.redirectMismatchTitle,
    body: m.redirectMismatch(provider),
    tone: 'warning',
    action: 'none',
  },
  session_required: {
    title: m.sessionRequiredTitle,
    body: m.sessionRequired(provider),
    tone: 'info',
    action: 'none',
  },
  provider_refused: {
    title: m.providerRefusedTitle(provider),
    body: m.providerRefused,
    tone: 'warning',
    action: 'retry',
  },
  provider_off: {
    title: m.providerOffTitle,
    body: m.providerOff,
    tone: 'blocked',
    action: 'none',
  },
  provider_unavailable: {
    title: m.providerUnavailableTitle(provider),
    body: m.providerUnavailable,
    tone: 'warning',
    action: 'retry',
  },
  invalid_token: {
    title: m.invalidTokenTitle(provider),
    body: m.invalidToken,
    tone: 'warning',
    action: 'none',
  },
  sign_in_failed: {
    title: m.failedTitle,
    body: m.failed,
    tone: 'warning',
    action: 'retry',
  },
});

/** The card of a code in the URL. A code that this list does not have gets the general card. */
export const signInErrorCard = (code: string | null, provider: string): SignInErrorCard => {
  const all = cards(provider);
  const known = code !== null && Object.hasOwn(all, code) ? code : 'sign_in_failed';
  return { code: known, ...all[known] } as SignInErrorCard;
};
