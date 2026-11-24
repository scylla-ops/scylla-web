import { userState } from '@platform/user-state';
import { WHATS_NEW, type Release } from '@base/shell/whats-new.ts';

const RELEASE_ID = 'release';

const SEEN_IDS: readonly string[] = [
  RELEASE_ID,
  ...WHATS_NEW.highlights.map(highlight => highlight.id),
];

const seenKey = (id: string) => `whats-new-seen:${WHATS_NEW.version}:${id}`;

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
  // An entry of another version says nothing about this one.
  decode: value => {
    const { version, seen } = (value ?? {}) as Partial<SeenFlags>;
    if (version !== WHATS_NEW.version || !Array.isArray(seen)) return null;
    return flags(id => seen.includes(id));
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

/** Reactive. */
export const unseenRelease = (): Release | null => (isUnseen(RELEASE_ID) ? WHATS_NEW : null);

export const dismissRelease = (): void => markSeen(RELEASE_ID);
