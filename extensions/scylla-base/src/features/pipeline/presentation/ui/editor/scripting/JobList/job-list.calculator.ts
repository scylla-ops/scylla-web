import type { PipelineStep } from '@base/features/pipeline/domain/structs/pipeline.struct.ts';
import { stepDepths } from '@base/features/pipeline/presentation/utils/pipeline-steps.ts';
import { nodeIdIssue, stepIssue } from '@base/features/pipeline/presentation/utils/step-summary.ts';

export interface JobRow {
  step: PipelineStep;
  /** The indent of the row: how many jobs run before it, as the columns of the blueprint. */
  depth: number;
  /** The job cannot be saved or run as it is. */
  hasIssue: boolean;
}

/** The jobs in the order they run: by depth, then in the order of the document. */
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
