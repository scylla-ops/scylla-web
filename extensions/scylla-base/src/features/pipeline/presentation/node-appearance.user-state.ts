import { userState } from '@platform/user-state';

/** The node styles of the canvas. Adding one: a name here, a view in `nodes/node-appearances.registry.ts`. */
export const NODE_APPEARANCES = ['detailed', 'minimal'] as const;
export type NodeAppearance = (typeof NODE_APPEARANCES)[number];

export const NODE_APPEARANCE_KEY = 'scylla.blueprint.node-appearance';

export const isNodeAppearance = (value: unknown): value is NodeAppearance =>
  NODE_APPEARANCES.includes(value as NodeAppearance);

/** `pipeline.module.ts` imports this file: the editor chunk comes after the read of the server. */
export const nodeAppearanceState = userState.define<NodeAppearance>({
  key: 'node-appearance',
  decode: value => (isNodeAppearance(value) ? value : null),
  readLocal: () => {
    const stored = globalThis.localStorage?.getItem(NODE_APPEARANCE_KEY);
    return isNodeAppearance(stored) ? stored : null;
  },
  writeLocal: (_, value) => globalThis.localStorage?.setItem(NODE_APPEARANCE_KEY, value),
});
