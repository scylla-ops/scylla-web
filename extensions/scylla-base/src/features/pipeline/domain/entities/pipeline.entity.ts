import { pipelineNameIssue, type PipelineNameIssue } from '../structs/pipeline-name.struct.ts';
import { nodeIdIssue, type NodeId } from '../structs/node-id.struct.ts';
import type { PortName } from '../structs/port-name.struct.ts';
import {
  nodeIssue,
  portsOf,
  runsStep,
  sameDependency,
  withDefinition,
  withDependencies,
  withoutDependency,
  withRenamedReference,
  type Dependency,
  type NodeIssue,
  type PipelineNodeEntity,
  type NodeDefinition,
} from './pipeline-node.entity.ts';

export interface PipelineIdentity {
  id: string;
  projectId: string;
  name: string;
}

/** What a new job asks from the agents. */
export interface PipelineRun {
  /** A node runs in a container: only an agent with a container runtime takes the job. */
  needsContainer: boolean;
}

export interface PipelineMetadata extends PipelineIdentity {
  nodeCount: number;
  createdAt: string;
  updatedAt: string;
}

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
      deps: [{ node: 'welcome' }],
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

/** What stops a pipeline from being saved. `nodes`: their switch or their needs break a rule of the server. */
export type PipelineIssue =
  | { kind: 'name'; issue: PipelineNameIssue }
  | { kind: 'repeated-ids'; ids: NodeId[] }
  | { kind: 'node-ids'; ids: NodeId[] }
  | { kind: 'nodes'; ids: NodeId[] };

/** The ids of each node that `id` waits for, directly or through other nodes. */
export const nodesBefore = (nodes: PipelineNodes, id: NodeId): Set<NodeId> => {
  const depsOf = new Map(nodes.map(node => [node.id, node.deps]));
  const seen = new Set<NodeId>();
  const pending = [...(depsOf.get(id) ?? [])];

  while (pending.length) {
    const next = pending.pop()!.node;
    if (seen.has(next)) continue;
    seen.add(next);
    pending.push(...(depsOf.get(next) ?? []));
  }
  return seen;
};

/** The nodes whose outputs a switch can read: the nodes that run a step before it. */
export const outputCandidates = (nodes: PipelineNodes, id: NodeId): NodeId[] => {
  const before = nodesBefore(nodes, id);
  return nodes.filter(node => runsStep(node) && before.has(node.id)).map(node => node.id);
};

/** A need on a port that its node does not have, else an output of a node that does not run a step before the switch. */
const graphIssue = (
  nodes: PipelineNodes,
  byId: Map<NodeId, PipelineNodeEntity>,
  node: PipelineNodeEntity,
): NodeIssue | null => {
  for (const need of node.deps) {
    const other = byId.get(need.node);
    if (other && need.port !== undefined && !portsOf(other).includes(need.port))
      return { kind: 'need', issue: { kind: 'unknown-port', need } };
  }
  if (node.kind !== 'switch') return null;

  const sources = outputCandidates(nodes, node.id);
  for (const { port, rules } of node.cases) {
    for (const operand of rules.flatMap(rule => [rule.left, rule.right])) {
      if (operand?.kind === 'output' && !sources.includes(operand.node))
        return { kind: 'switch', issue: { kind: 'output-node', port, node: operand.node } };
    }
  }
  return null;
};

/** The issue of each node that has one: its own (`nodeIssue`), else what the other nodes decide. */
export const nodeIssues = (nodes: PipelineNodes): Map<NodeId, NodeIssue> => {
  const byId = new Map(nodes.map(node => [node.id, node]));
  const issues = new Map<NodeId, NodeIssue>();
  for (const node of nodes) {
    const issue = nodeIssue(node) ?? graphIssue(nodes, byId, node);
    if (issue && !issues.has(node.id)) issues.set(node.id, issue);
  }
  return issues;
};

/**
 * The first reason the pipeline cannot be saved, or `null`. The server refuses the whole pipeline
 * for one node id, one switch or one need. A node that cannot run yet is not one: the server says it.
 */
export const pipelineIssue = ({
  name,
  nodes,
}: Pick<PipelineEntity, 'name' | 'nodes'>): PipelineIssue | null => {
  const nameIssue = pipelineNameIssue(name);
  if (nameIssue) return { kind: 'name', issue: nameIssue };

  const repeated = repeatedNodeIds(nodes);
  if (repeated.length) return { kind: 'repeated-ids', ids: repeated };

  const ids = nodes.filter(node => nodeIdIssue(node.id)).map(node => node.id);
  if (ids.length) return { kind: 'node-ids', ids };

  const broken = [...nodeIssues(nodes)]
    .filter(([, issue]) => issue.kind === 'switch' || issue.kind === 'need')
    .map(([id]) => id);
  return broken.length ? { kind: 'nodes', ids: broken } : null;
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

const needKey = ({ node, port }: Dependency) => `${node}:${port ?? ''}`;

/** A repeated id or a repeated need (a node and a port): the nodes cannot be keyed by id. */
export const hasRepeats = (nodes: PipelineNodes): boolean =>
  idsOf(nodes).size < nodes.length ||
  nodes.some(node => new Set(node.deps.map(needKey)).size < node.deps.length);

/** Adds a node at the end. A taken id gets a suffix; `after` is the node it waits for. */
export const addNode = (
  nodes: PipelineNodes,
  desiredId: string,
  definition: NodeDefinition,
  after?: NodeId,
): NodesChange => {
  const id = uniqueNodeId(desiredId.trim() || 'node', idsOf(nodes));
  const deps = after && nodes.some(node => node.id === after) ? [{ node: after }] : [];
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

/** The needs on the port `from` of the node `id` follow its new name. */
export const renamePort = (
  nodes: PipelineNodes,
  id: NodeId,
  from: PortName,
  to: PortName,
): PipelineNodes =>
  nodes.map(node =>
    node.deps.some(dep => dep.node === id && dep.port === from)
      ? withDependencies(
          node,
          node.deps.map(dep => (dep.node === id && dep.port === from ? { ...dep, port: to } : dep)),
        )
      : node,
  );

/** Removes the needs on a port of the node `id`: a case, `otherwise` or `error` that goes. */
export const dropPort = (nodes: PipelineNodes, id: NodeId, port: PortName): PipelineNodes =>
  nodes.map(node =>
    node.deps.some(dep => dep.node === id && dep.port === port)
      ? withDependencies(
          node,
          node.deps.filter(dep => dep.node !== id || dep.port !== port),
        )
      : node,
  );

/** Removes a node, and the dependencies on it. */
export const removeNode = (nodes: PipelineNodes, id: NodeId): PipelineNodes =>
  nodes.filter(node => node.id !== id).map(node => withoutDependency(node, id));

export const setDependencies = (
  nodes: PipelineNodes,
  id: NodeId,
  deps: Dependency[],
): PipelineNodes => nodes.map(node => (node.id === id ? withDependencies(node, deps) : node));

/** The nodes that wait for this one, on any of its ports. */
export const dependentsOf = (nodes: PipelineNodes, id: NodeId): NodeId[] =>
  nodes.filter(node => node.deps.some(dep => dep.node === id)).map(node => node.id);

/**
 * The needs this node can have: on each node but itself and those that wait for it (or the graph
 * loops), with no port, and on each port of that node.
 */
export const dependencyCandidates = (nodes: PipelineNodes, id: NodeId): Dependency[] =>
  nodes
    .filter(node => node.id !== id && !waitsFor(nodes, node.id, id))
    .flatMap(node => [{ node: node.id }, ...portsOf(node).map(port => ({ node: node.id, port }))]);

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
    for (const { node: dep } of node.deps) {
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

/** True when `id` waits for `other`, directly or through other nodes, on any port. */
export const waitsFor = (nodes: PipelineNodes, id: NodeId, other: NodeId): boolean =>
  nodesBefore(nodes, id).has(other);

/** Waits for `target` only, or for it too with `keep`; for no node when `target` is `null`. The need has no port. */
const depsAfterMove = (deps: Dependency[], target: NodeId | null, keep: boolean): Dependency[] => {
  if (target === null) return [];
  const need = { node: target };
  if (!keep) return [need];
  return deps.some(dep => sameDependency(dep, need)) ? deps : [...deps, need];
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
    if (!leaves || !node.deps.some(dep => dep.node === id)) return node;
    const deps = node.deps.flatMap(dep => (dep.node === id ? moved.deps : [dep]));
    return withDependencies(
      node,
      deps.filter((dep, index) => deps.findIndex(other => sameDependency(dep, other)) === index),
    );
  });
};
