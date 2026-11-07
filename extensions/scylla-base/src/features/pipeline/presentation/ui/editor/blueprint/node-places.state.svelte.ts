import {
  isEmptyLayout,
  withinLimit,
  type NodePlace,
  type PipelineLayout,
} from '@base/features/pipeline/domain/structs/pipeline-layout.struct.ts';
import {
  placesOf,
  type FlowNode,
} from '@base/features/pipeline/presentation/mappers/blueprint-flow.mapper.ts';

export interface NodePlacesParams {
  /** The nodes that the server holds. A new or a renamed node is not one of them. */
  savedIds: () => readonly string[];
  save: (places: PipelineLayout) => void;
}

/** A row of quick drags makes one request. */
const SAVE_DELAY_MS = 500;

/**
 * Where the places of the canvas go. A saved node goes to the server at the end of a drag, with no
 * Save button. Another node has no row on the server yet: its place waits for the next save of the
 * pipeline, in the same transaction as the node.
 */
export const createNodePlaces = (params: NodePlacesParams) => {
  let current: () => readonly FlowNode[] = () => [];
  let start: NodePlace | undefined;
  // eslint-disable-next-line svelte/prefer-svelte-reactivity -- what waits for a timer, never state
  const moved = new Map<string, NodePlace>();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const send = () => {
    timer = undefined;
    const layout: PipelineLayout = {
      ...(start && { start }),
      nodes: withinLimit([...moved]),
    };
    start = undefined;
    moved.clear();
    if (!isEmptyLayout(layout)) params.save(layout);
  };

  return {
    /** The blueprint gives the graph that it holds. */
    connect(read: () => readonly FlowNode[]) {
      current = read;
    },

    moved(flowNodes: readonly Pick<FlowNode, 'id' | 'position'>[]) {
      const saved = new Set(params.savedIds());
      const places = placesOf(flowNodes);
      start = places.start ?? start;
      for (const [id, place] of places.nodes) if (saved.has(id)) moved.set(id, place);

      clearTimeout(timer);
      timer = setTimeout(send, SAVE_DELAY_MS);
    },

    /**
     * The places that go with the save of the pipeline. With no saved node, nothing holds a place
     * yet, so the start node goes too.
     */
    waiting(): PipelineLayout | undefined {
      const saved = new Set(params.savedIds());
      const places = placesOf(current());
      const layout: PipelineLayout = {
        ...(saved.size === 0 && places.start && { start: places.start }),
        nodes: withinLimit(places.nodes.filter(([id]) => !saved.has(id))),
      };
      return isEmptyLayout(layout) ? undefined : layout;
    },
  };
};

export type NodePlaces = ReturnType<typeof createNodePlaces>;
