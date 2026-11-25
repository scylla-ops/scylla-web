import type { XYPosition } from '@xyflow/svelte';
import {
  DETAILED_NODE,
  MINIMAL_NODE,
} from '@base/features/pipeline/presentation/presenters/blueprint-geometry.presenter.ts';

/** The look of the nodes, as the handles of a node depend on it. */
type NodeAppearance = 'detailed' | 'minimal';

/**
 * What a drop on the canvas connects the new node to: inside an edge, after a node, or nothing
 * (`null`: the user held the modifier key). The preview and the drop both read it.
 */
export type DropLink = { replacing: string } | { after: string } | null;

/** A node of the graph, as a drop sees it: its box, in graph points. */
export interface DropNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The node that a new node at `point` waits for: the closest one before it, else the start node. */
export const nearestBefore = (
  nodes: readonly DropNode[],
  point: XYPosition,
  startId: string,
): string => {
  let best: { id: string; distance: number } | undefined;
  for (const node of nodes) {
    const centre = { x: node.x + node.width / 2, y: node.y + node.height / 2 };
    // Before the point: the node is on its left, in the flow direction.
    if (centre.x >= point.x) continue;
    const distance = Math.hypot(point.x - centre.x, point.y - centre.y);
    if (!best || distance < best.distance) best = { id: node.id, distance };
  }
  return best?.id ?? startId;
};

/** The one rule of a drop: an edge under the point wins, then the nearest node before it. */
export const linkForDrop = (input: {
  nodes: readonly DropNode[];
  point: XYPosition;
  edgeId?: string;
  startId: string;
  /** The modifier key is held: no connection. */
  detached?: boolean;
}): DropLink => {
  if (input.detached) return null;
  if (input.edgeId) return { replacing: input.edgeId };
  return { after: nearestBefore(input.nodes, input.point, input.startId) };
};

/** Where an edge leaves a node, and where it enters it: the handles of the appearance. */
export const outputPointOf = (appearance: NodeAppearance, node: DropNode): XYPosition =>
  appearance === 'minimal'
    ? { x: node.x + (MINIMAL_NODE.width + MINIMAL_NODE.tile) / 2, y: node.y + MINIMAL_NODE.tile / 2 }
    : { x: node.x + (node.width || DETAILED_NODE.width), y: node.y + (node.height || DETAILED_NODE.height) / 2 };

export const inputPointOf = (appearance: NodeAppearance, node: DropNode): XYPosition =>
  appearance === 'minimal'
    ? { x: node.x + (MINIMAL_NODE.width - MINIMAL_NODE.tile) / 2, y: node.y + MINIMAL_NODE.tile / 2 }
    : { x: node.x, y: node.y + (node.height || DETAILED_NODE.height) / 2 };

/** A preview edge: from a point to a point, in graph points. */
export interface PreviewEdge {
  from: XYPosition;
  to: XYPosition;
}

/**
 * The edges that the drop makes, for the preview. `spot` is the box of the new node. An insert
 * draws two: before and after the new node.
 */
export const previewEdges = (input: {
  appearance: NodeAppearance;
  nodes: readonly DropNode[];
  edges: readonly { id: string; source: string; target: string }[];
  link: DropLink;
  /** The new node, at its position. */
  spot: DropNode;
}): PreviewEdge[] => {
  const { appearance, nodes, edges, link, spot } = input;
  if (!link) return [];
  const find = (id: string) => nodes.find(node => node.id === id);
  const into = inputPointOf(appearance, spot);
  const out = outputPointOf(appearance, spot);

  if ('after' in link) {
    const source = find(link.after);
    return source ? [{ from: outputPointOf(appearance, source), to: into }] : [];
  }
  const edge = edges.find(candidate => candidate.id === link.replacing);
  const source = edge && find(edge.source);
  const target = edge && find(edge.target);
  if (!source || !target) return [];
  return [
    { from: outputPointOf(appearance, source), to: into },
    { from: out, to: inputPointOf(appearance, target) },
  ];
};
