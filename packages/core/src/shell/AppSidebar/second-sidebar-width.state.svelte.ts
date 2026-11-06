export const RAIL_SLOT_PX = 56;

const MIN_WIDTH_PX = 140;
const DEFAULT_WIDTH_PX = 200;
const MAX_WIDTH_PX = 400;
/** A table of 640 px and the padding of the page: a resize never turns a table into cards. */
const PAGE_MIN_WIDTH_PX = 704;
const STORAGE_KEY = 'scylla.shell.second-sidebar-width';

const between = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/** The width of the second sidebar, remembered by this browser. A blocked storage only forgets it. */
export const createSecondSidebarWidth = (
  viewportWidth: () => number,
  storage: () => Storage | undefined = () => globalThis.localStorage,
) => {
  const read = (): number => {
    try {
      const stored = storage()?.getItem(STORAGE_KEY);
      const width = stored ? Number(stored) : DEFAULT_WIDTH_PX;
      return Number.isFinite(width) ? width : DEFAULT_WIDTH_PX;
    } catch {
      return DEFAULT_WIDTH_PX;
    }
  };

  let chosen = $state(read());

  const max = $derived(
    Math.max(
      DEFAULT_WIDTH_PX,
      Math.min(MAX_WIDTH_PX, viewportWidth() - RAIL_SLOT_PX - PAGE_MIN_WIDTH_PX),
    ),
  );

  return {
    min: MIN_WIDTH_PX,
    default: DEFAULT_WIDTH_PX,
    get max() {
      return max;
    },
    /** A narrow window lowers this width, and a wider window gives the chosen width back. */
    get current() {
      return between(chosen, MIN_WIDTH_PX, max);
    },
    /** Follows a drag: `save` stores the width when the drag ends. */
    resize(next: number) {
      chosen = between(Math.round(next), MIN_WIDTH_PX, max);
    },
    save() {
      try {
        storage()?.setItem(STORAGE_KEY, String(chosen));
      } catch {
        // The width still lasts until the page is left.
      }
    },
  };
};

export type SecondSidebarWidth = ReturnType<typeof createSecondSidebarWidth>;
