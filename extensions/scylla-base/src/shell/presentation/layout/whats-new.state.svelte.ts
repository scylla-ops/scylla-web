import { userState } from '@platform/user-state';
import {
  HIGHLIGHT_VERSIONS,
  WHATS_NEW,
  type Release,
  type ReleaseHighlight,
  type TabVersion,
} from '@base/shell/whats-new.ts';

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

/**
 * Reactive. A highlight is new in the dialog until the user dismissed a dialog of its version or
 * of a later one, or opened its page. A user who saw 0.7.2 sees only the 0.7.3 highlights as new.
 */
export const isNewInRelease = (highlight: ReleaseHighlight): boolean => {
  void revision;
  if (hasFlag(highlight.id)) return false;
  const from = HIGHLIGHT_VERSIONS.indexOf(highlight.since);
  return !HIGHLIGHT_VERSIONS.slice(from).some(
    version => localStorage.getItem(`whats-new-seen:${version}:${RELEASE_ID}`) !== null,
  );
};

/** Reactive. The tab of a version gets a dot while one of its highlights is new. */
export const tabHasNew = (version: TabVersion): boolean =>
  WHATS_NEW.highlights.some(
    highlight => highlight.version === version && isNewInRelease(highlight),
  );

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
