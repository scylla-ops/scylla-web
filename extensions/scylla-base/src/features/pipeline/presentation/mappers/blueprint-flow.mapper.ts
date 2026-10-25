import type { Edge, Node } from '@xyflow/svelte';
import {
  definitionOf,
  type PipelineStepEntity,
} from '@base/features/pipeline/domain/entities/pipeline-step.entity.ts';
import { repeatedStepIds } from '@base/features/pipeline/domain/entities/pipeline.entity.ts';
import { layoutSteps } from '@base/features/pipeline/presentation/presenters/blueprint-layout.presenter.ts';

/** A node's `data` must be a `Record`: a step travels wrapped, as `{ step }`. */

/** `repeated`: another step has the same id. */
export type StepNodeData = { step: PipelineStepEntity; repeated?: true };
export type StartNodeData = { name: string };

export type BlueprintStepNode = Node<StepNodeData, 'pipelineStep'>;
export type BlueprintStartNode = Node<StartNodeData, 'startNode'>;
export type BlueprintNode = BlueprintStepNode | BlueprintStartNode;
export type BlueprintEdge = Edge;

export const START_NODE_ID = '__start__';
export const EDGE_COLOR = 'var(--input)';

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

/**
 * xyflow keys the nodes by id, so a step whose id is taken by an earlier one gets a key of its own
 * (`build#2`). Its step keeps its id: nothing is renamed, and the node is marked `repeated`.
 */
const nodeKeys = (steps: PipelineStepEntity[]): string[] => {
  const counts = new Map<string, number>();
  return steps.map(step => {
    const count = (counts.get(step.id) ?? 0) + 1;
    counts.set(step.id, count);
    return count === 1 ? step.id : `${step.id}#${count}`;
  });
};

/**
 * The graph of the steps, laid out by stage. A dependency on the step itself or on a step that
 * does not exist is not drawn; a dependency on a repeated id goes to the first step with it.
 */
export function stepsToFlow(
  steps: PipelineStepEntity[],
  pipelineName: string,
): { nodes: BlueprintNode[]; edges: BlueprintEdge[] } {
  const keys = nodeKeys(steps);
  const ids = new Set(steps.map(step => step.id));
  const repeated = new Set(repeatedStepIds(steps));
  const layout = layoutSteps(steps.map((step, index) => ({ ...step, id: keys[index] })));

  const startNode: BlueprintStartNode = {
    id: START_NODE_ID,
    type: 'startNode',
    position: layout.start,
    data: { name: pipelineName },
    deletable: false,
  };

  const stepNodes: BlueprintStepNode[] = steps.map((step, index) => ({
    id: keys[index],
    type: 'pipelineStep',
    position: layout.steps.get(keys[index]) ?? { x: 0, y: 0 },
    data: repeated.has(step.id) ? { step, repeated: true } : { step },
  }));

  const edges = steps.flatMap((step, index) => {
    const deps = step.deps.filter(dep => dep !== step.id && ids.has(dep));
    return deps.length
      ? deps.map(dep => edgeBetween(dep, keys[index]))
      : [edgeBetween(START_NODE_ID, keys[index])];
  });

  return { nodes: [startNode, ...stepNodes], edges };
}

export const stepOf = (node: BlueprintNode): PipelineStepEntity | undefined =>
  node.type === 'pipelineStep' ? node.data.step : undefined;

/** The ids of the steps a node waits for: the start node is not a step. */
export const depsOf = (edges: BlueprintEdge[], id: string): string[] =>
  edges
    .filter(edge => edge.target === id && edge.source !== START_NODE_ID)
    .map(edge => edge.source);

export function flowToSteps(nodes: BlueprintNode[], edges: BlueprintEdge[]): PipelineStepEntity[] {
  return nodes.flatMap(node => {
    const step = stepOf(node);
    if (!step) return [];

    return [{ id: step.id, deps: depsOf(edges, node.id), ...definitionOf(step) }];
  });
}
