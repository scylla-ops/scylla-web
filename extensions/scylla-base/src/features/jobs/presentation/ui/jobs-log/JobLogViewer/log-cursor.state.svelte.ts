/** A current place among the places of the log: the matches of the search, or the errors. */
export interface LogCursor<T> {
  readonly items: readonly T[];
  /** -1 before the first move, or when there is no place. */
  readonly index: number;
  readonly current: T | null;
  /** The next place, after the last one the first. */
  next: () => T | null;
  /** The place before, before the first one the last. */
  previous: () => T | null;
  reset: () => void;
}

/** `items` is a getter: the places grow with the log. The current one stays while it exists. */
export const createLogCursor = <T>(items: () => readonly T[]): LogCursor<T> => {
  let chosen = $state(-1);
  const list = $derived(items());
  const index = $derived(chosen < list.length ? chosen : -1);

  const move = (step: 1 | -1): T | null => {
    const count = list.length;
    if (count === 0) return null;
    chosen = index < 0 ? (step > 0 ? 0 : count - 1) : (index + step + count) % count;
    return list[chosen];
  };

  return {
    get items() {
      return list;
    },
    get index() {
      return index;
    },
    get current() {
      return index >= 0 ? list[index] : null;
    },
    next: () => move(1),
    previous: () => move(-1),
    reset: () => {
      chosen = -1;
    },
  };
};
