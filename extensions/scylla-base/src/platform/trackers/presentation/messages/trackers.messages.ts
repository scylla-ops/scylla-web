import { msg } from '@lingui/core/macro';
import type { MessageDescriptor } from '@lingui/core';
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
