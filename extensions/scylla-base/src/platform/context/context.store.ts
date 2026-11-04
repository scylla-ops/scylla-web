import { createStore } from '@scylla/ui/stores';

interface ContextItem {
  id: string | null;
  name: string | null;
}

/** The workspace also has its slug: the first segment of its URLs. */
interface WorkspaceItem extends ContextItem {
  slug: string | null;
}

interface ContextState {
  workspace: WorkspaceItem;
  /** An absent slug: the slug made from the name, for a context saved before the slugs. */
  setWorkspace: (id: string | null, name: string | null, slug?: string | null) => void;

  project: ContextItem;
  setProject: (id: string | null, name: string | null) => void;

  pipeline: ContextItem;
  setPipeline: (id: string | null, name: string | null) => void;

  reset: () => void;
}

const initialState = {
  workspace: { id: null, name: null, slug: null } as WorkspaceItem,
  project: { id: null, name: null } as ContextItem,
  pipeline: { id: null, name: null } as ContextItem,
};

/** Ids and names only, persisted in `localStorage`. */
export const contextStore = createStore<ContextState>(
  set => ({
    ...initialState,
    setWorkspace: (id, name, slug = null) =>
      set({
        workspace: { id, name, slug },
        project: { id: null, name: null },
        pipeline: { id: null, name: null },
      }),
    setProject: (id, name) => set({ project: { id, name } }),
    setPipeline: (id, name) => set({ pipeline: { id, name } }),
    reset: () => set(initialState),
  }),
  // A new key: the context saved before the workspaces had an `organization`, not a `workspace`.
  { persistAs: 'scylla-workspace-context' },
);
