import {
  stepProblem,
  type PipelineStepEntity,
} from '@base/features/pipeline/domain/entities/pipeline-step.entity.ts';
import { dependentsOf, stepDepths } from '@base/features/pipeline/domain/entities/pipeline.entity.ts';

export interface StepRow {
  step: PipelineStepEntity;
  /** Its stage: how many steps run before it, on the longest path. Its column in the blueprint. */
  depth: number;
  /** The step cannot be saved or run as it is. */
  hasIssue: boolean;
}

/** The steps in the order they run: by stage, then in the order of the document. */
export const stepRows = (steps: PipelineStepEntity[]): StepRow[] => {
  const depths = stepDepths(steps);
  return steps
    .map(step => ({
      step,
      depth: depths.get(step.id) ?? 0,
      hasIssue: !!stepProblem(step),
    }))
    .sort((a, b) => a.depth - b.depth);
};

/** The rows grouped by stage. A stage holds the steps that can run together. */
export const stepStages = (rows: StepRow[]): StepRow[][] => {
  const stages: StepRow[][] = [];
  for (const row of rows) (stages[row.depth] ??= []).push(row);
  return stages.filter(Boolean);
};

/** How a step relates to the step in focus: one it waits for, or one that waits for it. */
export type StepRelation = 'dependency' | 'dependent';

export const stepRelations = (
  steps: PipelineStepEntity[],
  focus: string | null,
): Map<string, StepRelation> => {
  const relations = new Map<string, StepRelation>();
  const focused = steps.find(step => step.id === focus);
  if (!focused) return relations;
  for (const dep of focused.deps) relations.set(dep, 'dependency');
  for (const id of dependentsOf(steps, focused.id)) relations.set(id, 'dependent');
  return relations;
};
