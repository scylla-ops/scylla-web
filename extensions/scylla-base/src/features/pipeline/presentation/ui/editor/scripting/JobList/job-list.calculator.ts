import type { PipelineStep } from '@base/features/pipeline/domain/structs/pipeline.struct.ts';
import { stepDepths, waitsFor } from '@base/features/pipeline/presentation/utils/pipeline-steps.ts';
import { nodeIdIssue, stepIssue } from '@base/features/pipeline/presentation/utils/step-summary.ts';

export interface JobRow {
  step: PipelineStep;
  /** Its stage: how many jobs run before it, on the longest path. Its column in the blueprint. */
  depth: number;
  /** The job cannot be saved or run as it is. */
  hasIssue: boolean;
}

/** The jobs in the order they run: by stage, then in the order of the document. */
export const jobRows = (steps: PipelineStep[]): JobRow[] => {
  const depths = stepDepths(steps);
  return steps
    .map(step => ({
      step,
      depth: depths.get(step.id) ?? 0,
      hasIssue: !!nodeIdIssue(step.id) || !!stepIssue(step),
    }))
    .sort((a, b) => a.depth - b.depth);
};

/** The rows grouped by stage. A stage holds the jobs that can run together. */
export const jobStages = (rows: JobRow[]): JobRow[][] => {
  const stages: JobRow[][] = [];
  for (const row of rows) (stages[row.depth] ??= []).push(row);
  return stages.filter(Boolean);
};

/** How a job relates to the job in focus: one it waits for, or one that waits for it. */
export type JobRelation = 'dependency' | 'dependent';

export const jobRelations = (
  steps: PipelineStep[],
  focus: string | null,
): Map<string, JobRelation> => {
  const relations = new Map<string, JobRelation>();
  const focused = steps.find(step => step.id === focus);
  if (!focused) return relations;
  for (const dep of focused.deps) relations.set(dep, 'dependency');
  for (const step of steps) if (step.deps.includes(focused.id)) relations.set(step.id, 'dependent');
  return relations;
};

/**
 * The dependencies of a job dropped in the list: on another job, it waits for that one only, or
 * for it too with `keep`; on no job (`null`), it runs first.
 */
export const depsAfterDrop = (deps: string[], target: string | null, keep: boolean): string[] => {
  if (target === null) return [];
  if (!keep) return [target];
  return deps.includes(target) ? deps : [...deps, target];
};

/**
 * The steps after a job is dropped in the list (`depsAfterDrop`). Dropped on a job that waits for
 * it, the job first leaves its place: the jobs that waited for it wait for what it waited for.
 * Nothing waits for it then, so the drop makes no loop: `a → b → c`, `b` on `c` gives `a → c → b`.
 */
export const stepsAfterDrop = (
  steps: PipelineStep[],
  id: string,
  target: string | null,
  keep: boolean,
): PipelineStep[] => {
  const moved = steps.find(step => step.id === id);
  // The document may have changed during the drag: a job that left is no target.
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
