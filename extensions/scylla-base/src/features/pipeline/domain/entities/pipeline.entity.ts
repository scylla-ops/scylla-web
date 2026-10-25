import type { PipelineIdentity } from '../structs/pipeline.struct.ts';
import { pipelineNameIssue, type PipelineNameIssue } from '../structs/pipeline-name.struct.ts';
import { nodeIdIssue, type NodeId } from '../structs/node-id.struct.ts';
import {
  withDefinition,
  withDependencies,
  withoutDependency,
  withRenamedReference,
  type PipelineNodeEntity,
  type NodeDefinition,
} from './pipeline-node.entity.ts';

/**
 * The root of its nodes: each node waits for the nodes of its `deps`, and the operations below
 * keep that graph whole. A rename or a removal follows into the dependencies of the others.
 */
export interface PipelineEntity extends PipelineIdentity {
  nodes: PipelineNodeEntity[];
}

export const DEFAULT_PIPELINE_NAME = 'my-pipeline';

/** What a new pipeline starts from: two nodes, the second waiting for the first. No id before it is saved. */
export const newPipeline = (projectId: string): Omit<PipelineEntity, 'id'> => ({
  projectId,
  name: DEFAULT_PIPELINE_NAME,
  nodes: [
    {
      id: 'welcome',
      deps: [],
      env: [],
      kind: 'script',
      shell: 'sh',
      script: 'echo "Welcome to Scylla!"',
    },
    {
      id: 'example',
      deps: ['welcome'],
      env: [],
      kind: 'script',
      shell: 'sh',
      script: 'echo "This is an example pipeline."',
    },
  ],
});

/** The nodes of a pipeline: what the operations on its graph take and give back. */
export type PipelineNodes = PipelineEntity['nodes'];

/** The nodes after an operation, and the id the node really got. */
export interface NodesChange {
  nodes: PipelineNodes;
  id: NodeId;
}

/** What stops a pipeline from being saved. */
export type PipelineIssue =
  | { kind: 'name'; issue: PipelineNameIssue }
  | { kind: 'repeated-ids'; ids: NodeId[] }
  | { kind: 'node-ids'; ids: NodeId[] };

/** The first reason the pipeline cannot be saved, or `null`. The server refuses the whole pipeline for one node id. */
export const pipelineIssue = ({
  name,
  nodes,
}: Pick<PipelineEntity, 'name' | 'nodes'>): PipelineIssue | null => {
  const nameIssue = pipelineNameIssue(name);
  if (nameIssue) return { kind: 'name', issue: nameIssue };

  const repeated = repeatedNodeIds(nodes);
  if (repeated.length) return { kind: 'repeated-ids', ids: repeated };

  const ids = nodes.filter(node => nodeIdIssue(node.id)).map(node => node.id);
  return ids.length ? { kind: 'node-ids', ids } : null;
};

/** `excludeId` is the node's own id when it is renamed. */
export function uniqueNodeId(
  desired: string,
  existingIds: Set<NodeId>,
  excludeId?: NodeId,
): NodeId {
  const ids = new Set(existingIds);
  if (excludeId) ids.delete(excludeId);
  if (!ids.has(desired)) return desired;
  let i = 1;
  while (ids.has(`${desired}_${i}`)) i++;
  return `${desired}_${i}`;
}

const idsOf = (nodes: PipelineNodes) => new Set(nodes.map(node => node.id));

/** The ids that two nodes or more share. Each node must have its own: the others wait for it by id. */
export const repeatedNodeIds = (nodes: PipelineNodes): NodeId[] => {
  const seen = new Set<NodeId>();
  const repeated = new Set<NodeId>();
  for (const { id } of nodes) (seen.has(id) ? repeated : seen).add(id);
  return [...repeated];
};

/** A repeated id or a repeated dependency: the nodes cannot be keyed by id. */
export const hasRepeats = (nodes: PipelineNodes): boolean =>
  idsOf(nodes).size < nodes.length ||
  nodes.some(node => new Set(node.deps).size < node.deps.length);

/** Adds a node at the end. A taken id gets a suffix; `after` is the node it waits for. */
export const addNode = (
  nodes: PipelineNodes,
  desiredId: string,
  definition: NodeDefinition,
  after?: NodeId,
): NodesChange => {
  const id = uniqueNodeId(desiredId.trim() || 'node', idsOf(nodes));
  const deps = after && nodes.some(node => node.id === after) ? [after] : [];
  return { nodes: [...nodes, { id, deps, ...definition }], id };
};

export const updateNode = (
  nodes: PipelineNodes,
  id: NodeId,
  definition: NodeDefinition,
): PipelineNodes => nodes.map(node => (node.id === id ? withDefinition(node, definition) : node));

/**
 * Renames a node, and the dependencies on it. An empty id keeps the old one, a taken id gets a
 * suffix: the node stays usable.
 */
export const renameNode = (nodes: PipelineNodes, id: NodeId, desired: string): NodesChange => {
  const trimmed = desired.trim();
  if (!trimmed || trimmed === id || !nodes.some(node => node.id === id)) return { nodes, id };

  const next = uniqueNodeId(trimmed, idsOf(nodes), id);
  return { nodes: nodes.map(node => withRenamedReference(node, id, next)), id: next };
};

/** Removes a node, and the dependencies on it. */
export const removeNode = (nodes: PipelineNodes, id: NodeId): PipelineNodes =>
  nodes.filter(node => node.id !== id).map(node => withoutDependency(node, id));

export const setDependencies = (nodes: PipelineNodes, id: NodeId, deps: NodeId[]): PipelineNodes =>
  nodes.map(node => (node.id === id ? withDependencies(node, deps) : node));

/** The nodes that wait for this one. */
export const dependentsOf = (nodes: PipelineNodes, id: NodeId): NodeId[] =>
  nodes.filter(node => node.deps.includes(id)).map(node => node.id);

/** The nodes this one can wait for: not itself, and none that waits for it, or the graph loops. */
export const dependencyCandidates = (nodes: PipelineNodes, id: NodeId): NodeId[] =>
  nodes.filter(node => node.id !== id && !waitsFor(nodes, node.id, id)).map(node => node.id);

/**
 * How many nodes run before each one, on the longest path: its column. A missing node adds no
 * column. A loop, which only a document typed by hand can hold, is cut where it closes,
 * so the walk ends.
 */
export function nodeDepths(nodes: PipelineNodes): Map<NodeId, number> {
  const byId = new Map(nodes.map(node => [node.id, node]));
  const depths = new Map<NodeId, number>();
  const onPath = new Set<NodeId>();

  const depthOf = (node: PipelineNodeEntity): number => {
    const known = depths.get(node.id);
    if (known !== undefined) return known;

    onPath.add(node.id);
    let depth = 0;
    for (const dep of node.deps) {
      const parent = byId.get(dep);
      if (parent && !onPath.has(dep)) depth = Math.max(depth, depthOf(parent) + 1);
    }
    onPath.delete(node.id);

    depths.set(node.id, depth);
    return depth;
  };

  for (const node of nodes) depthOf(node);
  return depths;
}

/** True when `id` waits for `other`, directly or through other nodes. */
export const waitsFor = (nodes: PipelineNodes, id: NodeId, other: NodeId): boolean => {
  const depsOf = new Map(nodes.map(node => [node.id, node.deps]));
  const seen = new Set<NodeId>();
  const pending = [...(depsOf.get(id) ?? [])];

  while (pending.length) {
    const next = pending.pop()!;
    if (next === other) return true;
    if (seen.has(next)) continue;
    seen.add(next);
    pending.push(...(depsOf.get(next) ?? []));
  }
  return false;
};

/** Waits for `target` only, or for it too with `keep`; for no node when `target` is `null`. */
const depsAfterMove = (deps: NodeId[], target: NodeId | null, keep: boolean): NodeId[] => {
  if (target === null) return [];
  if (!keep) return [target];
  return deps.includes(target) ? deps : [...deps, target];
};

/**
 * Makes a node wait for `target` (see `depsAfterMove`). When `target` waits for the node, the node
 * first leaves its place: the nodes that waited for it wait for what it waited for. Nothing waits
 * for it then, so the move makes no loop: `a → b → c`, `b` after `c` gives `a → c → b`.
 */
export const moveNode = (
  nodes: PipelineNodes,
  id: NodeId,
  target: NodeId | null,
  keep: boolean,
): PipelineNodes => {
  const moved = nodes.find(node => node.id === id);
  // A node that left the document is no target.
  if (!moved || target === id || (target !== null && !nodes.some(node => node.id === target)))
    return nodes;

  const leaves = target !== null && waitsFor(nodes, target, id);
  return nodes.map(node => {
    if (node.id === id) return withDependencies(node, depsAfterMove(node.deps, target, keep));
    if (!leaves || !node.deps.includes(id)) return node;
    const deps = node.deps.flatMap(dep => (dep === id ? moved.deps : [dep]));
    return withDependencies(node, [...new Set(deps)]);
  });
};
