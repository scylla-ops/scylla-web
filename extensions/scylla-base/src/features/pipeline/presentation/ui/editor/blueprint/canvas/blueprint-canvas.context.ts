import { createContext } from 'svelte';
import type { XYPosition } from '@xyflow/svelte';
import type { StepDefinition } from '@base/features/pipeline/domain/structs/pipeline.struct.ts';
import type { NodeAppearance } from './node-appearance.svelte.ts';

/** What the custom nodes and edges need from the canvas: xyflow hands them only their own props. */
export interface BlueprintCanvasContext {
  appearance: () => NodeAppearance;
  isDetached: (stepId: string) => boolean;
  /** The icon hint of the template whose code the step runs, if any. */
  iconHintOf: (definition: StepDefinition) => string | undefined;
  /** `flow` places the new step; `client` places the menu that picks it. */
  insertOnEdge: (edgeId: string, at: { flow: XYPosition; client: XYPosition }) => void;
}

export const [getBlueprintCanvas, setBlueprintCanvas] = createContext<BlueprintCanvasContext>();
