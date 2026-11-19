import type { Edge, Node } from '@xyflow/svelte';
import {
  definitionOf,
  type PipelineNodeEntity,
} from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';
import { repeatedNodeIds } from '@base/features/pipeline/domain/entities/pipeline.entity.ts';
import type { FragmentLink } from '@base/features/pipeline/domain/entities/fragment.entity.ts';
import {
  toNodePlace,
  type NodePlace,
  type PipelineLayout,
} from '@base/features/pipeline/domain/structs/pipeline-layout.struct.ts';
import { layoutNodes } from '@base/features/pipeline/presentation/presenters/blueprint-layout.presenter.ts';

/** A node's `data` must be a `Record`: a node travels wrapped, as `{ node }`. */

/** `repeated`: another node has the same id. */
export type PipelineFlowNodeData = { node: PipelineNodeEntity; repeated?: true };
export type StartFlowNodeData = { name: string };

/** A block that links a fragment: one element of the graph for all the nodes of the fragment. */
export type FragmentFlowNodeData = { link: FragmentLink; nodes: PipelineNodeEntity[] };

export type PipelineFlowNode = Node<PipelineFlowNodeData, 'pipelineNode'>;
export type FragmentFlowNode = Node<FragmentFlowNodeData, 'fragmentNode'>;
export type StartFlowNode = Node<StartFlowNodeData, 'startNode'>;
export type FlowNode = PipelineFlowNode | FragmentFlowNode | StartFlowNode;
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

const unique = <T>(values: T[]): T[] => [...new Set(values)];

/**
 * The links that the graph can draw as one block: all their nodes are in the document, once,
 * and no other link holds them. Another link (the nodes were renamed or removed in the Scripting
 * tab) is drawn as its nodes.
 */
const drawableLinks = (nodes: PipelineNodeEntity[], links: readonly FragmentLink[]) => {
  const counts = new Map<string, number>();
  for (const { id } of nodes) counts.set(id, (counts.get(id) ?? 0) + 1);
  const taken = new Set<string>();

  return links.filter(link => {
    const whole =
      link.nodeIds.length > 0 &&
      !counts.has(link.blockId) &&
      link.nodeIds.every(id => counts.get(id) === 1 && !taken.has(id));
    if (whole) link.nodeIds.forEach(id => taken.add(id));
    return whole;
  });
};

/** The nodes of a block, with the dependencies between them only: its edges give the others. */
const blockNodes = (nodes: PipelineNodeEntity[], link: FragmentLink): PipelineNodeEntity[] => {
  const members = new Set(link.nodeIds);
  return nodes
    .filter(node => members.has(node.id))
    .map(node => ({ ...node, deps: node.deps.filter(dep => members.has(dep)) }));
};

/**
 * The graph of the nodes, laid out by stage. A dependency on the node itself or on a node that
 * does not exist is not drawn; a dependency on a repeated id goes to the first node with it. A
 * saved place goes before the automatic one. The nodes of a link are one block, placed at the
 * place of its first node.
 */
export function nodesToFlow(
  nodes: PipelineNodeEntity[],
  pipelineName: string,
  saved?: PipelineLayout | null,
  links: readonly FragmentLink[] = [],
): { flowNodes: FlowNode[]; edges: FlowEdge[] } {
  const drawn = drawableLinks(nodes, links);
  const blockOf = new Map(drawn.flatMap(link => link.nodeIds.map(id => [id, link.blockId] as const)));
  const follow = (id: string) => blockOf.get(id) ?? id;

  const loose = nodes.filter(node => !blockOf.has(node.id));
  const keys = nodeKeys(loose);
  const keyOf = new Map(loose.map((node, index) => [node, keys[index]]));
  const repeated = new Set(repeatedNodeIds(loose));

  // A block is one node of the layout, which waits for what its nodes wait for outside it.
  const graph = nodes.flatMap(node => {
    const blockId = blockOf.get(node.id);
    if (blockId === undefined) {
      return [{ ...node, id: keyOf.get(node) ?? node.id, deps: unique(node.deps.map(follow)) }];
    }
    const link = drawn.find(candidate => candidate.blockId === blockId)!;
    if (link.nodeIds[0] !== node.id) return [];
    const deps = nodes
      .filter(member => blockOf.get(member.id) === blockId)
      .flatMap(member => member.deps.map(follow))
      .filter(dep => dep !== blockId);
    return [{ ...node, id: blockId, deps: unique(deps) }];
  });
  const ids = new Set(graph.map(node => node.id));
  const layout = layoutNodes(graph);

  const startNode: StartFlowNode = {
    id: START_NODE_ID,
    type: 'startNode',
    position: saved?.start ?? layout.start,
    data: { name: pipelineName },
    deletable: false,
  };

  const elements = graph.map((entry): PipelineFlowNode | FragmentFlowNode => {
    const link = drawn.find(candidate => candidate.blockId === entry.id);
    if (link) {
      return {
        id: link.blockId,
        type: 'fragmentNode',
        position: saved?.nodes[link.nodeIds[0]] ?? layout.nodes.get(link.blockId) ?? { x: 0, y: 0 },
        data: { link, nodes: blockNodes(nodes, link) },
      };
    }
    const node = loose[keys.indexOf(entry.id)];
    return {
      id: entry.id,
      type: 'pipelineNode',
      position: saved?.nodes[entry.id] ?? layout.nodes.get(entry.id) ?? { x: 0, y: 0 },
      data: repeated.has(node.id) ? { node, repeated: true } : { node },
    };
  });

  const edges = graph.flatMap(entry => {
    const deps = entry.deps.filter(dep => dep !== entry.id && ids.has(dep));
    return deps.length
      ? deps.map(dep => edgeBetween(dep, entry.id))
      : [edgeBetween(START_NODE_ID, entry.id)];
  });

  return { flowNodes: [startNode, ...elements], edges };
}

/** The places of these elements of the graph: the start node apart, the nodes by id. */
export const placesOf = (
  flowNodes: readonly Pick<FlowNode, 'id' | 'position'>[],
): { start?: NodePlace; nodes: (readonly [string, NodePlace])[] } => {
  const start = flowNodes.find(flowNode => flowNode.id === START_NODE_ID);
  return {
    ...(start && { start: toNodePlace(start.position) }),
    nodes: flowNodes
      .filter(flowNode => flowNode.id !== START_NODE_ID)
      .map(flowNode => [placeKeyOf(flowNode), toNodePlace(flowNode.position)] as const),
  };
};

/** The server keeps the places of nodes: a block keeps its place as the place of its first node. */
const placeKeyOf = (flowNode: Pick<FlowNode, 'id'> & { data?: unknown }): string => {
  const data = flowNode.data as Partial<FragmentFlowNodeData> | undefined;
  return data?.link?.nodeIds[0] ?? flowNode.id;
};

export const nodeOf = (flowNode: FlowNode): PipelineNodeEntity | undefined =>
  flowNode.type === 'pipelineNode' ? flowNode.data.node : undefined;

export const blockOf = (flowNode: FlowNode): FragmentFlowNodeData | undefined =>
  flowNode.type === 'fragmentNode' ? flowNode.data : undefined;

/** The links that the blocks of the graph hold. */
export const linksOf = (flowNodes: FlowNode[]): FragmentLink[] =>
  flowNodes.flatMap(flowNode => {
    const block = blockOf(flowNode);
    return block ? [{ ...block.link, nodeIds: block.nodes.map(node => node.id) }] : [];
  });

/** The nodes of a block that no other node of the block waits for: what comes after waits for them. */
const lastNodesOf = ({ nodes }: FragmentFlowNodeData): string[] =>
  nodes.filter(node => !nodes.some(other => other.deps.includes(node.id))).map(node => node.id);

/** The ids of the nodes: a block stands for its nodes. Seen from after it, for its last ones. */
export const expandBlocks = (flowNodes: FlowNode[], ids: string[], side: 'first' | 'last'): string[] => {
  const blocks = new Map(
    flowNodes.flatMap(flowNode => {
      const block = blockOf(flowNode);
      if (!block) return [];
      const members = side === 'last' ? lastNodesOf(block) : block.nodes.map(node => node.id);
      return [[flowNode.id, members] as const];
    }),
  );
  return ids.flatMap(id => blocks.get(id) ?? [id]);
};

/** The ids of the nodes a node waits for: the start node is not a node. */
export const depsOf = (edges: FlowEdge[], id: string): string[] =>
  edges
    .filter(edge => edge.target === id && edge.source !== START_NODE_ID)
    .map(edge => edge.source);

export function flowToNodes(flowNodes: FlowNode[], edges: FlowEdge[]): PipelineNodeEntity[] {
  const depsAt = (id: string) => expandBlocks(flowNodes, depsOf(edges, id), 'last');

  return flowNodes.flatMap(flowNode => {
    const node = nodeOf(flowNode);
    if (node) return [{ id: node.id, deps: depsAt(flowNode.id), ...definitionOf(node) }];

    // The first nodes of a block wait for what the block waits for.
    const block = blockOf(flowNode);
    if (!block) return [];
    const outside = depsAt(flowNode.id);
    return block.nodes.map(member => ({
      id: member.id,
      deps: member.deps.length ? member.deps : outside,
      ...definitionOf(member),
    }));
  });
}
