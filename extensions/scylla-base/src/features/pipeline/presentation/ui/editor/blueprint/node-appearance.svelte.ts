/** The node styles of the canvas. Adding one: a name here, a view in `nodes/node-appearances.ts`. */
export const NODE_APPEARANCES = ['detailed', 'minimal'] as const;
export type NodeAppearance = (typeof NODE_APPEARANCES)[number];

export const DEFAULT_NODE_APPEARANCE: NodeAppearance = 'detailed';
const STORAGE_KEY = 'scylla.blueprint.node-appearance';

const isAppearance = (value: unknown): value is NodeAppearance =>
  NODE_APPEARANCES.includes(value as NodeAppearance);

/** The viewer's node style, remembered by the browser. A blocked storage only forgets it. */
export const createNodeAppearance = (
  storage: () => Storage | undefined = () => globalThis.localStorage,
) => {
  const read = (): NodeAppearance => {
    try {
      const stored = storage()?.getItem(STORAGE_KEY);
      return isAppearance(stored) ? stored : DEFAULT_NODE_APPEARANCE;
    } catch {
      return DEFAULT_NODE_APPEARANCE;
    }
  };

  let current = $state<NodeAppearance>(read());

  return {
    get current() {
      return current;
    },
    set(next: NodeAppearance) {
      current = next;
      try {
        storage()?.setItem(STORAGE_KEY, next);
      } catch {
        // The choice still lasts until the page is left.
      }
    },
  };
};

export type NodeAppearancePreference = ReturnType<typeof createNodeAppearance>;
