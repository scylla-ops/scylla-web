import type { Edge, Node } from '@xyflow/svelte';
import type {
  PipelineStep,
  StepDefinition,
} from '@base/features/pipeline/domain/structs/pipeline.struct.ts';

/** A node's `data` must be a `Record`: a step travels wrapped, as `{ step }`. */

export type StepNodeData = { step: PipelineStep };
export type StartNodeData = { name: string };

export type BlueprintStepNode = Node<StepNodeData, 'pipelineStep'>;
export type BlueprintStartNode = Node<StartNodeData, 'startNode'>;
export type BlueprintNode = BlueprintStepNode | BlueprintStartNode;
export type BlueprintEdge = Edge;

export const START_NODE_ID = '__start__';
export const EDGE_COLOR = 'var(--input)';

/** The layout cell: wide enough for the widest node appearance. */
export const NODE_WIDTH = 220;
const NODE_HEIGHT = 112;
const HORIZONTAL_GAP = 72;
const VERTICAL_GAP = 40;
const START_NODE_OFFSET = NODE_WIDTH + HORIZONTAL_GAP;

export const DEFAULT_EDGE_STYLE = {
  type: 'deletable',
  markerEnd: { type: 'arrowclosed', color: EDGE_COLOR, width: 16, height: 16 },
} satisfies Partial<BlueprintEdge>;

export const edgeBetween = (source: string, target: string): BlueprintEdge => ({
  id: `${source}->${target}`,
  source,
  target,
  ...DEFAULT_EDGE_STYLE,
});

/** The column of each node, by BFS from the roots. */
function computeDepths(steps: PipelineStep[]): Map<string, number> {
  const depthMap = new Map<string, number>();
  const childrenOf = new Map<string, string[]>();

  for (const step of steps) {
    childrenOf.set(step.id, []);
  }
  for (const step of steps) {
    for (const dep of step.deps) {
      childrenOf.get(dep)?.push(step.id);
    }
  }

  const roots = steps.filter(s => s.deps.length === 0);
  const queue: { id: string; depth: number }[] = roots.map(r => ({ id: r.id, depth: 0 }));

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    const current = depthMap.get(id);
    if (current !== undefined && current >= depth) continue;
    depthMap.set(id, depth);
    for (const child of childrenOf.get(id) ?? []) {
      queue.push({ id: child, depth: depth + 1 });
    }
  }

  for (const step of steps) {
    if (!depthMap.has(step.id)) {
      depthMap.set(step.id, 0);
    }
  }

  return depthMap;
}

/** Deduplicates ids, removes self-deps and deps to missing nodes. */
export function sanitizeSteps(steps: PipelineStep[]): PipelineStep[] {
  const seen = new Set<string>();
  const idMap = new Map<string, string>();
  const deduped: PipelineStep[] = [];

  for (const step of steps) {
    let id = step.id;
    if (seen.has(id)) {
      let i = 1;
      while (seen.has(`${step.id}_${i}`)) i++;
      id = `${step.id}_${i}`;
    }
    seen.add(id);
    idMap.set(step.id, id);
    deduped.push({ ...step, id });
  }

  const validIds = new Set(deduped.map(s => s.id));

  return deduped.map(s => ({
    ...s,
    deps: s.deps.map(d => idMap.get(d) ?? d).filter(d => d !== s.id && validIds.has(d)),
  }));
}

export function stepsToFlow(
  rawSteps: PipelineStep[],
  pipelineName: string,
): { nodes: BlueprintNode[]; edges: BlueprintEdge[]; sanitizedSteps: PipelineStep[] } {
  const steps = sanitizeSteps(rawSteps);
  const depthMap = computeDepths(steps);

  const depthGroups = new Map<number, PipelineStep[]>();
  for (const step of steps) {
    const d = depthMap.get(step.id) ?? 0;
    if (!depthGroups.has(d)) depthGroups.set(d, []);
    depthGroups.get(d)!.push(step);
  }

  const maxGroupSize = Math.max(1, ...Array.from(depthGroups.values()).map(g => g.length));
  const totalHeight = maxGroupSize * (NODE_HEIGHT + VERTICAL_GAP) - VERTICAL_GAP;

  const startNode: BlueprintStartNode = {
    id: START_NODE_ID,
    type: 'startNode',
    position: { x: 0, y: totalHeight / 2 - NODE_HEIGHT / 2 },
    data: { name: pipelineName },
    deletable: false,
  };

  const stepNodes: BlueprintStepNode[] = steps.map(step => {
    const depth = depthMap.get(step.id) ?? 0;
    const group = depthGroups.get(depth) ?? [step];
    const indexInGroup = group.indexOf(step);

    return {
      id: step.id,
      type: 'pipelineStep',
      position: {
        x: START_NODE_OFFSET + depth * (NODE_WIDTH + HORIZONTAL_GAP),
        y: indexInGroup * (NODE_HEIGHT + VERTICAL_GAP),
      },
      data: { step },
    };
  });

  const stepEdges = steps.flatMap(step => step.deps.map(dep => edgeBetween(dep, step.id)));

  const roots = steps.filter(s => s.deps.length === 0);
  const startEdges = roots.map(root => edgeBetween(START_NODE_ID, root.id));

  return {
    nodes: [startNode, ...stepNodes],
    edges: [...startEdges, ...stepEdges],
    sanitizedSteps: steps,
  };
}

export const stepOf = (node: BlueprintNode): PipelineStep | undefined =>
  node.type === 'pipelineStep' ? node.data.step : undefined;

/** The step without its id and dependencies, which the canvas owns. */
export const definitionOf = (step: PipelineStep): StepDefinition => {
  const base = { workingDir: step.workingDir, env: step.env };
  return step.kind === 'script'
    ? { ...base, kind: 'script', script: step.script, shell: step.shell }
    : { ...base, kind: 'exec', command: step.command, args: step.args };
};

/** The ids of the steps a node waits for: the start node is not a step. */
export const depsOf = (edges: BlueprintEdge[], id: string): string[] =>
  edges
    .filter(edge => edge.target === id && edge.source !== START_NODE_ID)
    .map(edge => edge.source);

export function flowToSteps(nodes: BlueprintNode[], edges: BlueprintEdge[]): PipelineStep[] {
  return nodes.flatMap(node => {
    const step = stepOf(node);
    if (!step) return [];

    return [{ id: step.id, deps: depsOf(edges, node.id), ...definitionOf(step) }];
  });
}

/** `exclude` is the node's own id when renaming it. */
export function generateUniqueNodeId(
  desired: string,
  existingIds: Set<string>,
  excludeId?: string,
): string {
  const ids = new Set(existingIds);
  if (excludeId) ids.delete(excludeId);
  if (!ids.has(desired)) return desired;
  let i = 1;
  while (ids.has(`${desired}_${i}`)) i++;
  return `${desired}_${i}`;
}
