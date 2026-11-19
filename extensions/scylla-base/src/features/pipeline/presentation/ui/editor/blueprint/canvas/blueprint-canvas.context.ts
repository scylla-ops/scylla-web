import { createContext } from 'svelte';
import type { XYPosition } from '@xyflow/svelte';
import type { NodeDefinition } from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';
import type { FragmentEntity } from '@base/features/pipeline/domain/entities/fragment.entity.ts';
import type { NodeAppearance } from './node-appearance-preference.state.svelte.ts';

/** What the custom nodes and edges need from the canvas: xyflow hands them only their own props. */
export interface BlueprintCanvasContext {
  appearance: () => NodeAppearance;
  isDetached: (nodeId: string) => boolean;
  /** The icon hint of the template whose code the node runs, if any. */
  iconHintOf: (definition: NodeDefinition) => string | undefined;
  /** `flow` places the new node; `client` places the menu that picks it. */
  insertOnEdge: (edgeId: string, at: { flow: XYPosition; client: XYPosition }) => void;
  /** The fragment that a block links, once the library is loaded. */
  fragmentOf: (fragmentId: string) => FragmentEntity | undefined;
}

export const [getBlueprintCanvas, setBlueprintCanvas] = createContext<BlueprintCanvasContext>();
