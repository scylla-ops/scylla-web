import { CONSENT_PURPOSES, fixedNamePart, type TrackerNeedingConsent } from '@platform/trackers';
import {
  CHOICE_LIFETIME_DAYS,
  type ConsentChoice,
  type ConsentGrants,
} from '../domain/structs/consent-choice.struct.ts';

/** The cookie of the choice. Its entry is in the tracker registry. */
const NAME = 'scylla_consent';

/** The cookie ends with the choice: then the banner asks again. */
const MAX_AGE_SECONDS = CHOICE_LIFETIME_DAYS * 86_400;

/** The name of each cookie of the page, with its value. */
const cookiesOf = (doc: Document): [string, string][] =>
  doc.cookie
    .split('; ')
    .filter(Boolean)
    .map(pair => {
      const equals = pair.indexOf('=');
      return equals < 0 ? [pair, ''] : [pair.slice(0, equals), pair.slice(equals + 1)];
    });

/** The choice of this browser. `null` with no cookie, or with a cookie that this build cannot read. */
export const readChoice = (doc: Document): ConsentChoice | null => {
  const raw = cookiesOf(doc).find(([name]) => name === NAME)?.[1];
  if (raw === undefined) return null;
  const fields = new URLSearchParams(decodeURIComponent(raw));
  const version = fields.get('v');
  const chosenAt = fields.get('t');
  if (!version || !chosenAt || Number.isNaN(Date.parse(chosenAt))) return null;
  const grants: ConsentGrants = {};
  for (const purpose of CONSENT_PURPOSES) {
    const value = fields.get(purpose);
    if (value === '1' || value === '0') grants[purpose] = value === '1';
  }
  return { id: fields.get('id') ?? '', version, chosenAt, grants };
};

/** Keeps the choice in the cookie, for 6 months. */
export const writeChoice = (doc: Document, choice: ConsentChoice): void => {
  const fields = new URLSearchParams({ v: choice.version, id: choice.id, t: choice.chosenAt });
  for (const [purpose, granted] of Object.entries(choice.grants)) {
    fields.set(purpose, granted ? '1' : '0');
  }
  const value = encodeURIComponent(fields.toString());
  const secure = doc.location.protocol === 'https:' ? '; Secure' : '';
  doc.cookie = `${NAME}=${value}; Path=/; Max-Age=${MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
};

/** The host and each parent domain with two labels or more: a script can set a cookie there. */
const domainsOf = (host: string): string[] => {
  const labels = host.split('.');
  return labels.slice(0, -1).map((_, index) => labels.slice(index).join('.'));
};

/** The names that match the name of a tracker: a part in angle brackets matches any text. */
const matcher = (tracker: TrackerNeedingConsent): ((name: string) => boolean) => {
  const fixed = fixedNamePart(tracker.name);
  return fixed === tracker.name ? name => name === fixed : name => name.startsWith(fixed);
};

/** Removes a cookie on the host and on each parent domain. */
const expire = (doc: Document, name: string): void => {
  const domains = domainsOf(doc.location.hostname).map(domain => `; Domain=${domain}`);
  for (const domain of ['', ...domains]) doc.cookie = `${name}=; Path=/; Max-Age=0${domain}`;
};

/** Removes the cookies and the storage keys of these trackers from this browser. */
export const removeTrackers = (doc: Document, trackers: readonly TrackerNeedingConsent[]): void => {
  const names = cookiesOf(doc).map(([name]) => name);
  for (const tracker of trackers) {
    const matches = matcher(tracker);
    if (tracker.type === 'cookie') {
      names.filter(matches).forEach(name => expire(doc, name));
      continue;
    }
    const view = doc.defaultView;
    const storage = tracker.type === 'local-storage' ? view?.localStorage : view?.sessionStorage;
    if (!storage) continue;
    const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index) ?? '');
    keys.filter(matches).forEach(key => storage.removeItem(key));
  }
};
