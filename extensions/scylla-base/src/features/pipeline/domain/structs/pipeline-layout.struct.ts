/** A place on the canvas, in whole pixels of the graph. */
export interface NodePlace {
  x: number;
  y: number;
}

/**
 * The places of the nodes on the canvas of a pipeline, by the id of the node. The start node is
 * not a node of the pipeline, so it has its own field.
 */
export interface PipelineLayout {
  start?: NodePlace;
  nodes: Readonly<Record<string, NodePlace>>;
}

/** The limits of the server. */
const MAX_DISTANCE = 1_000_000;
const MAX_NODE_PLACES = 256;

const onCanvas = (value: number) =>
  Math.max(-MAX_DISTANCE, Math.min(MAX_DISTANCE, Math.round(value)));

export const toNodePlace = ({ x, y }: NodePlace): NodePlace => ({ x: onCanvas(x), y: onCanvas(y) });

/** A longer request is refused whole: a node with no place gets an automatic place. */
export const withinLimit = (
  places: readonly (readonly [string, NodePlace])[],
): Readonly<Record<string, NodePlace>> => Object.fromEntries(places.slice(0, MAX_NODE_PLACES));

export const isEmptyLayout = ({ start, nodes }: PipelineLayout): boolean =>
  !start && Object.keys(nodes).length === 0;

/** The places that changed go over the saved ones, as on the server. */
export const mergeLayouts = (saved: PipelineLayout | null, changed: PipelineLayout): PipelineLayout => {
  const start = changed.start ?? saved?.start;
  return { ...(start && { start }), nodes: { ...saved?.nodes, ...changed.nodes } };
};
