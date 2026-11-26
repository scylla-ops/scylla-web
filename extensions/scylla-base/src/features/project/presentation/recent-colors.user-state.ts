import { userState } from '@platform/user-state';
import { MAX_RECENT_COLORS, withRecentColor } from '@scylla/ui';
import { isHexColor } from '@scylla/ui/utils';

export const RECENT_COLORS_KEY = 'scylla.recent-colors';

/** A list of at most 8 colors `#RRGGBB`, the most recent first. */
const decodeColors = (value: unknown): string[] | null =>
  Array.isArray(value) && value.every(color => typeof color === 'string' && isHexColor(color))
    ? (value as string[]).slice(0, MAX_RECENT_COLORS)
    : null;

const readColors = (): string[] => {
  try {
    return (
      decodeColors(JSON.parse(globalThis.localStorage?.getItem(RECENT_COLORS_KEY) ?? 'null')) ?? []
    );
  } catch {
    return [];
  }
};

const writeColors = (colors: readonly string[]) =>
  globalThis.localStorage?.setItem(RECENT_COLORS_KEY, JSON.stringify(colors));

/** `project.module.ts` imports this file: the key is defined before the read of the server. */
const recentColorsState = userState.define<string[]>({
  key: 'recent-colors',
  decode: decodeColors,
  readLocal: () => {
    const colors = readColors();
    return colors.length > 0 ? colors : null;
  },
  writeLocal: (_, colors) => writeColors(colors),
  // Two devices: the colors of this one first, then the other ones.
  merge: (server, local) => [...local, ...server].reduceRight(withRecentColor, [] as string[]),
});

/** The free colors that this person chose last, for the color pickers of the icons. */
export const recentColors = (): string[] => readColors();

/** Puts a free color first in the recent colors. A color of the theme is not kept. */
export const keepRecentColor = (color: string): void => {
  if (!isHexColor(color)) return;
  const colors = withRecentColor(readColors(), color);
  writeColors(colors);
  recentColorsState.save(colors);
};
