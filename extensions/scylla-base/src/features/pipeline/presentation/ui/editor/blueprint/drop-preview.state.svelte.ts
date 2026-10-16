import type { XYPosition } from '@xyflow/svelte';
import {
  START_NODE_ID,
  edgeBetween,
  type BlueprintEdge,
  type BlueprintNode,
  type BlueprintStepNode,
} from '@base/features/pipeline/presentation/utils/blueprint-converter.ts';
import type { CatalogEntry } from '@base/features/pipeline/presentation/utils/node-catalog.ts';

export const DROP_PREVIEW_ID = '__drop-preview__';
const DROP_PREVIEW_EDGE_ID = `${DROP_PREVIEW_ID}-edge`;

type Measured = BlueprintNode['measured'];

/**
 * The node and the link that a drop creates (a dropped step hangs off the start node), drawn
 * by the canvas itself: same style, same zoom, at the place of the drop. Inert: no pointer, no
 * selection, no handle to connect.
 */
export const previewElements = (
  entry: CatalogEntry,
  position: XYPosition,
  stepId: string,
  measured?: Measured,
): { node: BlueprintStepNode; edge: BlueprintEdge } => ({
  node: {
    id: DROP_PREVIEW_ID,
    type: 'pipelineStep',
    position,
    measured,
    data: { step: { id: stepId, deps: [], ...entry.definition }, preview: true },
    class: 'pointer-events-none opacity-60',
    selectable: false,
    draggable: false,
    connectable: false,
    deletable: false,
    focusable: false,
    zIndex: 1000,
  },
  edge: {
    ...edgeBetween(START_NODE_ID, DROP_PREVIEW_ID),
    id: DROP_PREVIEW_EDGE_ID,
    animated: true,
    selectable: false,
    deletable: false,
    focusable: false,
  },
});

export interface DropPreviewParams {
  /** The id the step will get: a taken one gets a suffix. */
  stepIdFor: (nodeId: string) => string;
}

/** A palette entry dragged over the canvas, and where it would land. */
export const createDropPreview = ({ stepIdFor }: DropPreviewParams) => {
  let entry = $state.raw<CatalogEntry | null>(null);
  // `null` while the entry is outside the canvas.
  let position = $state.raw<XYPosition | null>(null);
  // xyflow hides a node until it has measured it, and measures it once: a preview rebuilt
  // without these sizes at each move would stay hidden.
  let measured = $state.raw<Measured>(undefined);

  const elements = $derived(
    entry && position
      ? previewElements(entry, position, stepIdFor(entry.nodeId), measured)
      : null,
  );

  return {
    get entry() {
      return entry;
    },
    get elements() {
      return elements;
    },

    start(next: CatalogEntry) {
      entry = next;
      position = null;
      measured = undefined;
    },
    moveTo(next: XYPosition) {
      if (entry) position = next;
    },
    leave() {
      position = null;
    },
    end() {
      entry = null;
      position = null;
    },

    /** What the canvas draws: the graph, and the preview on top. */
    nodesWith: (nodes: BlueprintNode[]): BlueprintNode[] =>
      elements ? [...nodes, elements.node] : nodes,
    edgesWith: (edges: BlueprintEdge[]): BlueprintEdge[] =>
      elements ? [...edges, elements.edge] : edges,
    /** What the canvas writes back: the graph, never the preview. Keeps the preview's size. */
    nodesWithout(nodes: BlueprintNode[]) {
      const preview = nodes.find(node => node.id === DROP_PREVIEW_ID);
      if (preview?.measured && preview.measured !== measured) measured = preview.measured;
      return nodes.filter(node => node.id !== DROP_PREVIEW_ID);
    },
    edgesWithout: (edges: BlueprintEdge[]) =>
      edges.filter(edge => edge.id !== DROP_PREVIEW_EDGE_ID),
  };
};

export type DropPreview = ReturnType<typeof createDropPreview>;
