import type { IUserStateServiceClient } from '@base/generated/scylla/accounts/v1/user_state_service.client.ts';
import type { UserStateEntry } from '@base/generated/scylla/accounts/v1/user_state_service.ts';
import { ScyllaError } from '@shared/utils/scylla-error.ts';

export interface UserStateDefinition<T> {
  /** The key on the server: 1 to 128 lower case letters, digits, dots, colons, dashes or underscores. */
  key: string;
  /** The value of the server, or `null` when this build cannot read it. */
  decode: (value: unknown) => T | null;
  /** The local copy, or `null` when there is none. */
  readLocal: (userId: string) => T | null;
  writeLocal: (userId: string, value: T) => void;
  /** Removes the local copy of a deleted account. */
  removeLocal?: (userId: string) => void;
  /** With a merge, each write carries the version, and a conflict merges. Without it, the last write wins. */
  merge?: (server: T, local: T) => T;
  /** `false`: a local value does not prove a choice of the person, so only `save` writes it. */
  upload?: boolean;
}

export interface UserStateKey<T> {
  /** The caller writes the local copy first. A failed write stays marked, for the next page load. */
  save: (value: T) => void;
}

export type UserState = ReturnType<typeof createUserState>;

interface Mark {
  version?: string;
  dirty?: boolean;
}

const WRITE_ATTEMPTS = 3;

const bookKey = (userId: string) => `scylla-user-state:${userId}`;

const parse = (json: string): unknown => {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
};

const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);

/**
 * The state of the person on the server, with `localStorage` as its read copy. The server is read
 * one time at each page load, and the answer goes into the local copies. The readers read these
 * copies, so a reader never waits for the network after `whenLoaded`.
 */
export const createUserState = (
  client: IUserStateServiceClient,
  storage: () => Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = () => localStorage,
) => {
  const definitions = new Map<string, UserStateDefinition<unknown>>();
  /** The text of the value of the server for each key, as far as this tab knows. */
  const known = new Map<string, string>();
  const waiting = new Map<string, unknown>();
  const sending = new Set<string>();
  let userId: string | null = null;
  let loading: Promise<void> | null = null;
  let settled = false;
  let failed = false;
  let listening = false;

  const readBook = (user: string): Record<string, Mark> => {
    try {
      const book = parse(storage().getItem(bookKey(user)) ?? '{}');
      return typeof book === 'object' && book !== null ? (book as Record<string, Mark>) : {};
    } catch {
      return {};
    }
  };

  const mark = (user: string, key: string, next: Mark) => {
    try {
      storage().setItem(bookKey(user), JSON.stringify({ ...readBook(user), [key]: next }));
    } catch {
      // A blocked storage only makes the next page load a first run.
    }
  };

  const remember = (definition: UserStateDefinition<unknown>, value: unknown) =>
    known.set(definition.key, JSON.stringify(value));

  /** Another device wrote first: merges with what it wrote. Gives the value to send, if any. */
  const mergeAfterConflict = async (
    definition: UserStateDefinition<unknown>,
    user: string,
    value: unknown,
  ): Promise<unknown> => {
    const { key, decode, merge, readLocal, writeLocal } = definition;
    const { entries } = await client.getUserState({}).response;
    const entry = entries.find(candidate => candidate.key === key);
    const server = entry ? decode(parse(entry.valueJson)) : null;
    if (!entry || server === null || !merge) {
      mark(user, key, { ...(entry && { version: entry.version.toString() }), dirty: true });
      return value;
    }

    const merged = merge(server, readLocal(user) ?? value);
    remember(definition, server);
    writeLocal(user, merged);
    mark(user, key, { version: entry.version.toString(), dirty: !same(merged, server) });
    return same(merged, server) ? undefined : merged;
  };

  const send = async (
    definition: UserStateDefinition<unknown>,
    user: string,
    value: unknown,
    attempts = WRITE_ATTEMPTS,
  ): Promise<void> => {
    const { key, merge } = definition;
    const { version } = readBook(user)[key] ?? {};
    try {
      const { entry } = await client.putUserStateEntry({
        key,
        valueJson: JSON.stringify(value),
        ...(merge && { expectedVersion: BigInt(version ?? 0) }),
      }).response;
      remember(definition, value);
      mark(user, key, {
        ...(entry && { version: entry.version.toString() }),
        dirty: waiting.has(key),
      });
    } catch (thrown) {
      const error = ScyllaError.from(thrown);
      if (!error.isConflict() || attempts <= 1) {
        error.log();
        return;
      }
      const next = await mergeAfterConflict(definition, user, value);
      if (next !== undefined) await send(definition, user, next, attempts - 1);
    }
  };

  /** One write at a time for a key, because each write needs the version of the one before. */
  const write = (definition: UserStateDefinition<unknown>, user: string, value: unknown) => {
    const { key } = definition;
    waiting.set(key, value);
    if (sending.has(key)) return;

    sending.add(key);
    void (async () => {
      try {
        while (waiting.has(key)) {
          const next = waiting.get(key);
          waiting.delete(key);
          await send(definition, user, next);
        }
      } catch (thrown) {
        ScyllaError.from(thrown).log();
      } finally {
        sending.delete(key);
      }
    })();
  };

  const settle = (
    definition: UserStateDefinition<unknown>,
    user: string,
    entry: UserStateEntry | undefined,
  ) => {
    const { key, decode, merge, readLocal, writeLocal, upload } = definition;
    const { version, dirty } = readBook(user)[key] ?? {};
    const local = readLocal(user);
    const server = entry ? decode(parse(entry.valueJson)) : null;

    if (!entry || server === null) {
      const sends = local !== null && (dirty === true || upload !== false);
      mark(user, key, { ...(entry && { version: entry.version.toString() }), dirty: sends });
      if (sends) write(definition, user, local);
      return;
    }

    remember(definition, server);
    const serverVersion = entry.version.toString();
    let next: unknown = server;
    if (local !== null && dirty) {
      next = version === serverVersion || !merge ? local : merge(server, local);
    } else if (local !== null && version === undefined && merge) {
      next = merge(server, local);
    }

    const sends = !same(next, server);
    if (!same(next, local)) writeLocal(user, next);
    mark(user, key, { version: serverVersion, dirty: sends });
    if (sends) write(definition, user, next);
  };

  const read = (user: string) => {
    settled = false;
    failed = false;
    loading = client.getUserState({}).response.then(
      ({ entries }) => {
        for (const definition of definitions.values()) {
          try {
            settle(
              definition,
              user,
              entries.find(entry => entry.key === definition.key),
            );
          } catch (thrown) {
            ScyllaError.from(thrown).log();
          }
        }
        settled = true;
      },
      (thrown: unknown) => {
        ScyllaError.from(thrown).log();
        failed = true;
        settled = true;
      },
    );
  };

  /** The connection is back: reads again after a failed read, else sends what stayed marked. */
  const resume = () => {
    const user = userId;
    if (!user) return;
    if (failed) {
      read(user);
      return;
    }
    const book = readBook(user);
    for (const definition of definitions.values()) {
      const local = book[definition.key]?.dirty ? definition.readLocal(user) : null;
      if (local !== null) write(definition, user, local);
    }
  };

  return {
    /** At the top level of a file that the entry chunk holds: `load` only knows what is defined. */
    define<T>(definition: UserStateDefinition<T>): UserStateKey<T> {
      const stored = definition as unknown as UserStateDefinition<unknown>;
      definitions.set(definition.key, stored);
      return {
        save(value) {
          const user = userId;
          if (!user) return;
          if (!sending.has(definition.key) && known.get(definition.key) === JSON.stringify(value)) {
            return;
          }
          mark(user, definition.key, { ...readBook(user)[definition.key], dirty: true });
          if (settled) write(stored, user, value);
        },
      };
    },

    /** Reads the server one time for this user. The auth guard calls it at each route. */
    load(user: string) {
      if (user === userId && loading) return;
      userId = user;
      known.clear();
      read(user);
      if (!listening && typeof window !== 'undefined') {
        listening = true;
        window.addEventListener('online', resume);
      }
    },

    /** Resolves when the local copies hold the answer of the server. It also resolves after a failed read. */
    whenLoaded: (): Promise<void> => loading ?? Promise.resolve(),

    /** The server gave no answer: an empty local copy does not mean that the person has no value. */
    loadFailed: () => failed,

    /** The account is deleted: removes what this browser holds for it. */
    forget() {
      const user = userId;
      if (!user) return;
      for (const definition of definitions.values()) definition.removeLocal?.(user);
      try {
        storage().removeItem(bookKey(user));
      } catch {
        // Nothing reads it for a deleted account.
      }
    },
  };
};
