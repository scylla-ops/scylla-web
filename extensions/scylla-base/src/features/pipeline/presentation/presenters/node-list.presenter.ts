import {
  nodeProblem,
  type PipelineNodeEntity,
} from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';
import {
  dependentsOf,
  nodeDepths,
} from '@base/features/pipeline/domain/entities/pipeline.entity.ts';

export interface NodeRow {
  node: PipelineNodeEntity;
  /** Its stage: how many nodes run before it, on the longest path. Its column in the blueprint. */
  depth: number;
  /** The node cannot be saved or run as it is. */
  hasIssue: boolean;
}

/** The nodes in the order they run: by stage, then in the order of the document. */
export const nodeRows = (nodes: PipelineNodeEntity[]): NodeRow[] => {
  const depths = nodeDepths(nodes);
  return nodes
    .map(node => ({
      node,
      depth: depths.get(node.id) ?? 0,
      hasIssue: !!nodeProblem(node),
    }))
    .sort((a, b) => a.depth - b.depth);
};

/** The rows grouped by stage. A stage holds the nodes that can run together. */
export const nodeStages = (rows: NodeRow[]): NodeRow[][] => {
  const stages: NodeRow[][] = [];
  for (const row of rows) (stages[row.depth] ??= []).push(row);
  return stages.filter(Boolean);
};

/** How a node relates to the node in focus: one it waits for, or one that waits for it. */
export type NodeRelation = 'dependency' | 'dependent';

export const nodeRelations = (
  nodes: PipelineNodeEntity[],
  focus: string | null,
): Map<string, NodeRelation> => {
  const relations = new Map<string, NodeRelation>();
  const focused = nodes.find(node => node.id === focus);
  if (!focused) return relations;
  for (const dep of focused.deps) relations.set(dep, 'dependency');
  for (const id of dependentsOf(nodes, focused.id)) relations.set(id, 'dependent');
  return relations;
};
