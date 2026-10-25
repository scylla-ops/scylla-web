import type { LucideIcon } from '@scylla/ui';
import { t } from '@scylla/ui/i18n';
import { cn } from '@scylla/ui/utils';
import {
  stepProblem,
  type PipelineStepEntity,
  type StepDefinition,
} from '@base/features/pipeline/domain/entities/pipeline-step.entity.ts';
import { pipelineMessages } from '../messages/pipeline.messages.ts';
import { stepMessages } from '../messages/step.messages.ts';
import { STEP_ISSUE_MESSAGES, stepIdIssueText } from './step-issue.presenter.ts';
import { KIND_TONES, stepIcon } from './step-kind.presenter.ts';

/** A shebang, a comment or a `set -e` says nothing about what the step does. */
const isNoise = (line: string) => line.startsWith('#') || /^set\s/.test(line);

/** One line that tells what the step runs: the command, or the first meaningful script line. */
export const stepPreview = (definition: StepDefinition): string => {
  if (definition.kind === 'exec') return [definition.command, ...definition.args].join(' ').trim();

  return (
    definition.script
      .split('\n')
      .map(line => line.trim())
      .find(line => line !== '' && !isNoise(line)) ?? ''
  );
};

export const envCounts = (definition: StepDefinition) => {
  const secrets = definition.env.filter(entry => entry.kind === 'secret').length;
  return { variables: definition.env.length - secrets, secrets };
};

/** What every node appearance renders: computed once, so the views only lay it out. */
export interface StepSummary {
  icon: LucideIcon;
  tone: (typeof KIND_TONES)[PipelineStepEntity['kind']];
  /** `bash` and `sh` are names, not words: only `command` is translated. */
  kind: string;
  preview: string;
  /** Why the step cannot be saved or run: a refused id first, the server rejects the pipeline. */
  problem: { label: string; detail: string } | null;
  variables: number;
  secrets: number;
  workingDir?: string;
}

/**
 * Reads `t()`: called in a `$derived`, it follows a locale switch. `iconHint`: the icon of the
 * template whose code the step runs.
 */
export const summarize = (
  step: PipelineStepEntity,
  iconHint?: string,
  repeated = false,
): StepSummary => ({
  icon: stepIcon(step.kind, iconHint),
  tone: KIND_TONES[step.kind],
  kind: step.kind === 'script' ? step.shell : t(stepMessages.kindCommand),
  preview: stepPreview(step),
  problem: repeated ? repeatedProblem() : problemOf(step),
  ...envCounts(step),
  workingDir: step.workingDir,
});

/** Another step has the same id: the server refuses the pipeline, and the graph cannot edit it. */
const repeatedProblem = (): NonNullable<StepSummary['problem']> => ({
  label: t(pipelineMessages.repeatedStepId),
  detail: t(pipelineMessages.repeatedHint),
});

const problemOf = (step: PipelineStepEntity): StepSummary['problem'] => {
  const problem = stepProblem(step);
  if (!problem) return null;
  if (problem.kind === 'id')
    return { label: t(stepMessages.invalidId), detail: stepIdIssueText(problem.issue) };

  const text = t(STEP_ISSUE_MESSAGES[problem.issue]);
  return { label: text, detail: text };
};

export const handleClass = (summary: StepSummary, selected: boolean) =>
  cn('size-2.5! border-[1.5px]! bg-card!', selected ? summary.tone.handle : 'border-input!');
