import type { LucideIcon } from '@scylla/ui';
import { t } from '@scylla/ui/i18n';
import { cn } from '@scylla/ui/utils';
import type { PipelineStep } from '@base/features/pipeline/domain/structs/pipeline.struct.ts';
import {
  envCounts,
  nodeIdIssue,
  stepIssue,
  stepPreview,
} from '@base/features/pipeline/presentation/utils/step-summary.ts';
import { blueprintMessages } from '@base/features/pipeline/presentation/ui/editor/blueprint/blueprint.messages.ts';
import { KIND_TONES, stepIcon } from '@base/features/pipeline/presentation/ui/editor/step/step-kinds.ts';
import {
  ISSUE_MESSAGES,
  nodeIdIssueText,
} from '@base/features/pipeline/presentation/ui/editor/step/step-issue-text.ts';
import { stepMessages } from '@base/features/pipeline/presentation/ui/editor/step/step.messages.ts';

/** What every node appearance renders: computed once, so the views only lay it out. */
export interface StepSummary {
  icon: LucideIcon;
  tone: (typeof KIND_TONES)[PipelineStep['kind']];
  /** `bash` and `sh` are names, not words: only `command` is translated. */
  kind: string;
  preview: string;
  /** Why the step cannot be saved or run: a refused id first, the server rejects the pipeline. */
  problem: { label: string; detail: string } | null;
  variables: number;
  secrets: number;
  workingDir?: string;
}

export interface StepNodeViewProps {
  step: PipelineStep;
  selected: boolean;
  summary: StepSummary;
  /** No edge goes into the step: saving links it to the start node. */
  detached: boolean;
}

export interface StartNodeViewProps {
  name: string;
  selected: boolean;
}

/** Reads `t()`: called in a `$derived`, it follows a locale switch. */
/** `iconHint`: the icon of the template whose code the step runs. */
export const summarize = (step: PipelineStep, iconHint?: string): StepSummary => ({
  icon: stepIcon(step.kind, iconHint),
  tone: KIND_TONES[step.kind],
  kind: step.kind === 'script' ? step.shell : t(blueprintMessages.kindCommand),
  preview: stepPreview(step),
  problem: problemOf(step),
  ...envCounts(step),
  workingDir: step.workingDir,
});

const problemOf = (step: PipelineStep): StepSummary['problem'] => {
  const idIssue = nodeIdIssue(step.id);
  if (idIssue) return { label: t(stepMessages.invalidId), detail: nodeIdIssueText(idIssue) };

  const issue = stepIssue(step);
  if (!issue) return null;
  const text = t(ISSUE_MESSAGES[issue]);
  return { label: text, detail: text };
};

export const handleClass = (summary: StepSummary, selected: boolean) =>
  cn('size-2.5! border-[1.5px]! bg-card!', selected ? summary.tone.handle : 'border-input!');
