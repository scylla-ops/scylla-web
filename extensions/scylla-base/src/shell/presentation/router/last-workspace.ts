import { contextStore } from '@platform/context';
import { userState } from '@platform/user-state';

/** The id of the server when it differs from the context of this browser. */
let serverId: string | null = null;

const lastWorkspace = userState.define<{ id: string }>({
  key: 'last-workspace',
  decode: value => {
    const { id } = (value ?? {}) as { id?: unknown };
    return typeof id === 'string' ? { id } : null;
  },
  readLocal: () => {
    const { id } = contextStore.getState().workspace;
    return id ? { id } : null;
  },
  // Not into the context: it holds the name and the slug too, and only the list of the server has them.
  writeLocal: (_, { id }) => {
    serverId = id;
  },
  // The context holds what the last user of this browser left: `syncWorkspace` checks it in the list.
  upload: false,
});

export const lastWorkspaceId = (): string | null => serverId;

export const rememberWorkspace = (id: string): void => lastWorkspace.save({ id });
