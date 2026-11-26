import { userState } from '@platform/user-state';
import { MAX_PINS } from '@base/features/project/domain/structs/project-layout.struct.ts';

export const PROJECT_PINS_KEY = 'scylla.project-pins';
export const PROJECT_SECTIONS_KEY = 'scylla.project-sections';

/** For each workspace, a list of ids. */
type IdsByWorkspace = Record<string, string[]>;

const decoderOf =
  (max: number) =>
  (value: unknown): IdsByWorkspace | null => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
    const entries = Object.entries(value as Record<string, unknown>);
    const valid = entries.every(
      ([, ids]) => Array.isArray(ids) && ids.every(id => typeof id === 'string'),
    );
    return valid
      ? Object.fromEntries(entries.map(([id, ids]) => [id, (ids as string[]).slice(0, max)]))
      : null;
  };

/** A key of the person with a list of ids for each workspace, and its local copy. */
const defineIdsByWorkspace = (key: string, localKey: string, max: number) => {
  const decode = decoderOf(max);
  const read = (): IdsByWorkspace => {
    try {
      return decode(JSON.parse(globalThis.localStorage?.getItem(localKey) ?? 'null')) ?? {};
    } catch {
      return {};
    }
  };
  const write = (value: IdsByWorkspace) =>
    globalThis.localStorage?.setItem(localKey, JSON.stringify(value));

  // `project.module.ts` imports this file: the key is defined before the read of the server.
  const state = userState.define<IdsByWorkspace>({
    key,
    decode,
    readLocal: () => {
      const value = read();
      return Object.keys(value).length > 0 ? value : null;
    },
    writeLocal: (_, value) => write(value),
  });

  return {
    read: (workspaceId: string): string[] => read()[workspaceId] ?? [],
    save: (workspaceId: string, ids: readonly string[]) => {
      const others = Object.entries(read()).filter(([id]) => id !== workspaceId);
      const next = Object.fromEntries(
        ids.length > 0 ? [...others, [workspaceId, ids.slice(0, max)]] : others,
      );
      write(next);
      state.save(next);
    },
  };
};

/** The pins of the person, in their order: the section « Pinned » of the projects page. */
export const projectPins = defineIdsByWorkspace('project-pins', PROJECT_PINS_KEY, MAX_PINS);

/** The closed sections of the projects page: `pins`, `ungrouped` or the id of a group. */
export const closedSections = defineIdsByWorkspace('project-sections', PROJECT_SECTIONS_KEY, 200);
