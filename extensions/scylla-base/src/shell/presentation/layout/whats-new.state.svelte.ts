import { userState } from '@platform/user-state';
import { WHATS_NEW, type Release } from '@base/shell/whats-new.ts';

const RELEASE_ID = 'release';

const SEEN_IDS: readonly string[] = [
  RELEASE_ID,
  ...WHATS_NEW.highlights.map(highlight => highlight.id),
];

/** The version of a flag: a highlight keeps the version that announced it. */
const versionOf = (id: string): string =>
  WHATS_NEW.highlights.find(highlight => highlight.id === id)?.since ?? WHATS_NEW.version;

const seenKey = (id: string) => `whats-new-seen:${versionOf(id)}:${id}`;

interface SeenFlags {
  version: string;
  seen: readonly string[];
}

const hasFlag = (id: string) => localStorage.getItem(seenKey(id)) !== null;

let revision = $state(0);

const flags = (seen: (id: string) => boolean): SeenFlags => ({
  version: WHATS_NEW.version,
  seen: SEEN_IDS.filter(seen),
});

const seenFlags = userState.define<SeenFlags>({
  key: 'whats-new-seen',
  // An entry of the current version has every flag. An older entry has only the flags that
  // its version announced: the 0.7.0 flags stay, and the dialog shows again.
  decode: value => {
    const { version, seen } = (value ?? {}) as Partial<SeenFlags>;
    if (typeof version !== 'string' || !Array.isArray(seen)) return null;
    const current = version === WHATS_NEW.version;
    return flags(id => seen.includes(id) && (current || versionOf(id) === version));
  },
  readLocal: () => {
    const local = flags(hasFlag);
    return local.seen.length > 0 ? local : null;
  },
  writeLocal: (_, { seen }) => {
    seen.forEach(id => localStorage.setItem(seenKey(id), '1'));
    revision += 1;
  },
  merge: (server, local) => flags(id => server.seen.includes(id) || local.seen.includes(id)),
});

/** `markNavSeen` runs at each open of a link: a flag that is set sends nothing. */
export const markSeen = (id: string): void => {
  if (hasFlag(id)) return;
  localStorage.setItem(seenKey(id), '1');
  revision += 1;
  seenFlags.save(flags(hasFlag));
};

/** Reactive. */
export const isUnseen = (id: string): boolean => {
  void revision;
  return !hasFlag(id);
};

export const highlightIdForNav = (navUrl: string): string | undefined =>
  WHATS_NEW.highlights.find(highlight => highlight.navUrl === navUrl)?.id;

/** The user opened a sidebar link: its "New" badge goes away. */
export const markNavSeen = (navUrl: string): void => {
  const id = highlightIdForNav(navUrl);
  if (id) markSeen(id);
};

/** The user asked for the announcement again, from the menu. */
let reopened = $state(false);

export const reopenRelease = (): void => {
  reopened = true;
};

/** Reactive. */
export const unseenRelease = (): Release | null =>
  reopened || isUnseen(RELEASE_ID) ? WHATS_NEW : null;

export const dismissRelease = (): void => {
  reopened = false;
  markSeen(RELEASE_ID);
};
