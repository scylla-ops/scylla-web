import { userState } from '@platform/user-state';
import {
  isNodeAppearance,
  NODE_APPEARANCE_KEY,
  nodeAppearanceState,
  type NodeAppearance,
} from '@base/features/pipeline/presentation/node-appearance.user-state.ts';

export { NODE_APPEARANCES, type NodeAppearance } from '@base/features/pipeline/presentation/node-appearance.user-state.ts';

export const DEFAULT_NODE_APPEARANCE: NodeAppearance = 'detailed';

/** The viewer's node style, in the state of the person. A blocked storage only forgets it. */
export const createNodeAppearancePreference = (
  storage: () => Storage | undefined = () => globalThis.localStorage,
) => {
  const read = (): NodeAppearance => {
    try {
      const stored = storage()?.getItem(NODE_APPEARANCE_KEY);
      return isNodeAppearance(stored) ? stored : DEFAULT_NODE_APPEARANCE;
    } catch {
      return DEFAULT_NODE_APPEARANCE;
    }
  };

  let current = $state<NodeAppearance>(read());
  let chosen = false;

  // On a direct link to the editor, the answer of the server can come after this read.
  void userState.whenLoaded().then(() => {
    if (!chosen) current = read();
  });

  return {
    get current() {
      return current;
    },
    set(next: NodeAppearance) {
      chosen = true;
      current = next;
      try {
        storage()?.setItem(NODE_APPEARANCE_KEY, next);
      } catch {
        // The choice still lasts until the page is left.
      }
      nodeAppearanceState.save(next);
    },
  };
};

export type NodeAppearancePreference = ReturnType<typeof createNodeAppearancePreference>;
