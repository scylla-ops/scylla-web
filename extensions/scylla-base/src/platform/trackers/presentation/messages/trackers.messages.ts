import { msg } from '@lingui/core/macro';
import type { MessageDescriptor } from '@lingui/core';
import type { ConsentPurpose } from '../../domain/structs/consent-purpose.struct.ts';
import type { TrackerType } from '../../domain/structs/tracker.struct.ts';

export const trackerTypes: Record<TrackerType, MessageDescriptor> = {
  cookie: msg`Cookie`,
  'local-storage': msg`Local storage`,
  'session-storage': msg`Session storage`,
};

export const trackersMessages = {
  label: msg`Cookies and browser storage`,
  name: msg`Name`,
  purpose: msg`Purpose`,
  status: msg`Status`,
  /** Under the name: `Cookie · Scylla`. */
  source: (type: string, provider: string) => msg`${type} · ${provider}`,
  lifetimeOf: (lifetime: string) => msg`Lifetime: ${lifetime}`,
  exempt: msg`Strictly necessary`,
  needsConsent: msg`Needs consent`,
};

/** The name of each purpose, in the banner, the cookie settings and the table. */
export const consentPurposeTitles: Record<ConsentPurpose, MessageDescriptor> = {
  analytics: msg`Analytics`,
  marketing: msg`Marketing`,
  support: msg`Support`,
};

/** What the trackers of each purpose do, under its name in the cookie settings. */
export const consentPurposeDescriptions: Record<ConsentPurpose, MessageDescriptor> = {
  analytics: msg`Measure how people use the app, to make it better.`,
  marketing: msg`Measure the effect of the campaigns and show you offers that fit you.`,
  support: msg`Let you talk to the support team from the app.`,
};
