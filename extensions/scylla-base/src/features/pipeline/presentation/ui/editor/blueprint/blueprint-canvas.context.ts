import { createContext } from 'svelte';
import type { XYPosition } from '@xyflow/svelte';
import type { NodeAppearance } from '@base/features/pipeline/presentation/node-appearance.svelte.ts';

/** What the custom nodes and edges need from the canvas: xyflow hands them only their own props. */
export interface BlueprintCanvasContext {
  appearance: () => NodeAppearance;
  /** `flow` places the new step; `client` places the menu that picks it. */
  insertOnEdge: (edgeId: string, at: { flow: XYPosition; client: XYPosition }) => void;
}

export const [getBlueprintCanvas, setBlueprintCanvas] = createContext<BlueprintCanvasContext>();
