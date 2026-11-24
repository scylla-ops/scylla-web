import type { Edge, Node } from '@xyflow/svelte';
import {
  definitionOf,
  type Dependency,
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

/** `build->deploy`, or `is-main:true->deploy` for an edge from a port. */
export const edgeId = (source: string, target: string, port?: string | null): string =>
  port ? `${source}:${port}->${target}` : `${source}->${target}`;

/** An edge from a port leaves from its handle: `sourceHandle` is the port. */
export const edgeBetween = (source: string, target: string, port?: string | null): FlowEdge => ({
  id: edgeId(source, target, port),
  source,
  target,
  ...(port ? { sourceHandle: port } : {}),
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

/** The needs, once each: a node and a port. */
const uniqueDeps = (deps: Dependency[]): Dependency[] => {
  const seen = new Set<string>();
  return deps.filter(dep => {
    const key = `${dep.node}:${dep.port ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

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
    .map(node => ({ ...node, deps: node.deps.filter(dep => members.has(dep.node)) }));
};

/**
 * The graph of the nodes, laid out by stage. A dependency on the node itself or on a node that
 * does not exist is not drawn; a dependency on a repeated id goes to the first node with it. A need
 * on a port that its node does not have is kept: xyflow draws no edge from a missing handle. A
 * saved place goes before the automatic one. The nodes of a link are one block, placed at the
 * place of its first node; a block has no port.
 */
export function nodesToFlow(
  nodes: PipelineNodeEntity[],
  pipelineName: string,
  saved?: PipelineLayout | null,
  links: readonly FragmentLink[] = [],
): { flowNodes: FlowNode[]; edges: FlowEdge[] } {
  const drawn = drawableLinks(nodes, links);
  const blockOf = new Map(drawn.flatMap(link => link.nodeIds.map(id => [id, link.blockId] as const)));
  // A need of a node of a block is a need of the block, which has no port.
  const follow = (dep: Dependency): Dependency => {
    const block = blockOf.get(dep.node);
    return block === undefined ? dep : { node: block };
  };

  const loose = nodes.filter(node => !blockOf.has(node.id));
  const keys = nodeKeys(loose);
  const keyOf = new Map(loose.map((node, index) => [node, keys[index]]));
  const repeated = new Set(repeatedNodeIds(loose));

  // A block is one node of the layout, which waits for what its nodes wait for outside it.
  const graph = nodes.flatMap(node => {
    const blockId = blockOf.get(node.id);
    if (blockId === undefined) {
      return [{ ...node, id: keyOf.get(node) ?? node.id, deps: uniqueDeps(node.deps.map(follow)) }];
    }
    const link = drawn.find(candidate => candidate.blockId === blockId)!;
    if (link.nodeIds[0] !== node.id) return [];
    const deps = nodes
      .filter(member => blockOf.get(member.id) === blockId)
      .flatMap(member => member.deps.map(follow))
      .filter(dep => dep.node !== blockId);
    return [{ ...node, id: blockId, deps: uniqueDeps(deps) }];
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
    const deps = entry.deps.filter(dep => dep.node !== entry.id && ids.has(dep.node));
    return deps.length
      ? deps.map(dep => edgeBetween(dep.node, entry.id, dep.port))
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
  nodes
    .filter(node => !nodes.some(other => other.deps.some(dep => dep.node === node.id)))
    .map(node => node.id);

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

/** The needs of a node, with the port of each edge's handle: the start node is not a node. */
export const depsOf = (edges: FlowEdge[], id: string): Dependency[] =>
  edges
    .filter(edge => edge.target === id && edge.source !== START_NODE_ID)
    .map(edge =>
      edge.sourceHandle ? { node: edge.source, port: edge.sourceHandle } : { node: edge.source },
    );

/** The needs of a node: a need of a block is a need of its last nodes, with no port. */
const expandDeps = (flowNodes: FlowNode[], deps: Dependency[]): Dependency[] =>
  deps.flatMap(dep => {
    const members = expandBlocks(flowNodes, [dep.node], 'last');
    return members.length === 1 && members[0] === dep.node
      ? [dep]
      : members.map(node => ({ node }));
  });

export function flowToNodes(flowNodes: FlowNode[], edges: FlowEdge[]): PipelineNodeEntity[] {
  const depsAt = (id: string) => expandDeps(flowNodes, depsOf(edges, id));

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
