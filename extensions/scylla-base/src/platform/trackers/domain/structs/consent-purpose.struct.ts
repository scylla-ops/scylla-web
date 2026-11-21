/**
 * The purposes that a person accepts or refuses one by one, in the banner and in the cookie
 * settings. Each tracker that needs consent has one of them. The order is the order of the rows.
 */
export const CONSENT_PURPOSES = ['analytics', 'marketing', 'support'] as const;

/** A purpose of the trackers that need consent: the server records the choice of each one. */
export type ConsentPurpose = (typeof CONSENT_PURPOSES)[number];
