import type { Edge, Node } from '@xyflow/svelte';
import {
  definitionOf,
  type PipelineNodeEntity,
} from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';
import { repeatedNodeIds } from '@base/features/pipeline/domain/entities/pipeline.entity.ts';
import { layoutNodes } from '@base/features/pipeline/presentation/presenters/blueprint-layout.presenter.ts';

/** A node's `data` must be a `Record`: a node travels wrapped, as `{ node }`. */

/** `repeated`: another node has the same id. */
export type PipelineFlowNodeData = { node: PipelineNodeEntity; repeated?: true };
export type StartFlowNodeData = { name: string };

export type PipelineFlowNode = Node<PipelineFlowNodeData, 'pipelineNode'>;
export type StartFlowNode = Node<StartFlowNodeData, 'startNode'>;
export type FlowNode = PipelineFlowNode | StartFlowNode;
export type FlowEdge = Edge;

export const START_NODE_ID = '__start__';
export const EDGE_COLOR = 'var(--input)';

export const DEFAULT_EDGE_STYLE = {
  type: 'deletable',
  markerEnd: { type: 'arrowclosed', color: EDGE_COLOR, width: 16, height: 16 },
} satisfies Partial<FlowEdge>;

export const edgeBetween = (source: string, target: string): FlowEdge => ({
  id: `${source}->${target}`,
  source,
  target,
  ...DEFAULT_EDGE_STYLE,
});

/**
 * xyflow keys the nodes by id, so a node whose id is taken by an earlier one gets a key of its own
 * (`build#2`). Its node keeps its id: nothing is renamed, and the node is marked `repeated`.
 */
const nodeKeys = (nodes: PipelineNodeEntity[]): string[] => {
  const counts = new Map<string, number>();
  return nodes.map(node => {
    const count = (counts.get(node.id) ?? 0) + 1;
    counts.set(node.id, count);
    return count === 1 ? node.id : `${node.id}#${count}`;
  });
};

/**
 * The graph of the nodes, laid out by stage. A dependency on the node itself or on a node that
 * does not exist is not drawn; a dependency on a repeated id goes to the first node with it.
 */
export function nodesToFlow(
  nodes: PipelineNodeEntity[],
  pipelineName: string,
): { flowNodes: FlowNode[]; edges: FlowEdge[] } {
  const keys = nodeKeys(nodes);
  const ids = new Set(nodes.map(node => node.id));
  const repeated = new Set(repeatedNodeIds(nodes));
  const layout = layoutNodes(nodes.map((node, index) => ({ ...node, id: keys[index] })));

  const startNode: StartFlowNode = {
    id: START_NODE_ID,
    type: 'startNode',
    position: layout.start,
    data: { name: pipelineName },
    deletable: false,
  };

  const pipelineFlowNodes: PipelineFlowNode[] = nodes.map((node, index) => ({
    id: keys[index],
    type: 'pipelineNode',
    position: layout.nodes.get(keys[index]) ?? { x: 0, y: 0 },
    data: repeated.has(node.id) ? { node, repeated: true } : { node },
  }));

  const edges = nodes.flatMap((node, index) => {
    const deps = node.deps.filter(dep => dep !== node.id && ids.has(dep));
    return deps.length
      ? deps.map(dep => edgeBetween(dep, keys[index]))
      : [edgeBetween(START_NODE_ID, keys[index])];
  });

  return { flowNodes: [startNode, ...pipelineFlowNodes], edges };
}

export const nodeOf = (flowNode: FlowNode): PipelineNodeEntity | undefined =>
  flowNode.type === 'pipelineNode' ? flowNode.data.node : undefined;

/** The ids of the nodes a node waits for: the start node is not a node. */
export const depsOf = (edges: FlowEdge[], id: string): string[] =>
  edges
    .filter(edge => edge.target === id && edge.source !== START_NODE_ID)
    .map(edge => edge.source);

export function flowToNodes(flowNodes: FlowNode[], edges: FlowEdge[]): PipelineNodeEntity[] {
  return flowNodes.flatMap(flowNode => {
    const node = nodeOf(flowNode);
    if (!node) return [];

    return [{ id: node.id, deps: depsOf(edges, flowNode.id), ...definitionOf(node) }];
  });
}
