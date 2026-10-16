import type { PipelineStep } from '../../../../domain/structs/pipeline.struct.ts';

export interface StepSummary {
  /** One line of what it runs: the first non-blank script line, or the command line. */
  preview: string;
  /** A script step with no script, or a command step with no program: it cannot run yet. */
  isEmpty: boolean;
  /** `bash`, `sh` or `exec`. */
  tag: string;
}

export const summarizeStep = (step: PipelineStep): StepSummary => {
  if (step.kind === 'script') {
    const preview =
      step.script
        .split('\n')
        .find(line => line.trim() !== '')
        ?.trim() ?? '';
    return { preview, isEmpty: preview === '', tag: step.shell };
  }
  const program = step.command.trim();
  return {
    preview: [program, ...step.args].join(' ').trim(),
    isEmpty: program === '',
    tag: 'exec',
  };
};
