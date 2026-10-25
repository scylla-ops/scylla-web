import type { PipelineStepEntity } from '@base/features/pipeline/domain/entities/pipeline-step.entity.ts';
import { stepDepths, waitsFor } from '@base/features/pipeline/domain/services/step-graph.service.ts';
import { nodeIdIssue, stepIssue } from '@base/features/pipeline/domain/entities/pipeline-step.entity.ts';

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
      hasIssue: !!nodeIdIssue(step.id) || !!stepIssue(step),
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
  for (const step of steps) if (step.deps.includes(focused.id)) relations.set(step.id, 'dependent');
  return relations;
};

/**
 * The dependencies of a step dropped in the list: on another step, it waits for that one only, or
 * for it too with `keep`; on no step (`null`), it runs first.
 */
export const depsAfterDrop = (deps: string[], target: string | null, keep: boolean): string[] => {
  if (target === null) return [];
  if (!keep) return [target];
  return deps.includes(target) ? deps : [...deps, target];
};

/**
 * The steps after a step is dropped in the list (`depsAfterDrop`). Dropped on a step that waits for
 * it, the step first leaves its place: the steps that waited for it wait for what it waited for.
 * Nothing waits for it then, so the drop makes no loop: `a → b → c`, `b` on `c` gives `a → c → b`.
 */
export const stepsAfterDrop = (
  steps: PipelineStepEntity[],
  id: string,
  target: string | null,
  keep: boolean,
): PipelineStepEntity[] => {
  const moved = steps.find(step => step.id === id);
  // The document may have changed during the drag: a step that left is no target.
  if (!moved || target === id || (target !== null && !steps.some(step => step.id === target)))
    return steps;

  const leaves = target !== null && waitsFor(steps, target, id);
  return steps.map(step => {
    if (step.id === id) return { ...step, deps: depsAfterDrop(step.deps, target, keep) };
    if (!leaves || !step.deps.includes(id)) return step;
    const deps = step.deps.flatMap(dep => (dep === id ? moved.deps : [dep]));
    return { ...step, deps: [...new Set(deps)] };
  });
};
