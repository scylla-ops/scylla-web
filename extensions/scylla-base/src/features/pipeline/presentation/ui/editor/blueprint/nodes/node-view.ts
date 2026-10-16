import type { MessageDescriptor } from '@lingui/core';
import type { LucideIcon } from '@scylla/ui';
import { t } from '@scylla/ui/i18n';
import { cn } from '@scylla/ui/utils';
import type { PipelineStep } from '@base/features/pipeline/domain/structs/pipeline.struct.ts';
import {
  envCounts,
  nodeIdIssue,
  stepIssue,
  stepPreview,
  type NodeIdIssue,
  type StepIssue,
} from '@base/features/pipeline/presentation/utils/step-summary.ts';
import { blueprintMessages } from '../blueprint.messages.ts';
import { KIND_TONES, stepIcon } from '../step-kinds.ts';

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
export const summarize = (step: PipelineStep): StepSummary => ({
  icon: stepIcon(step.kind),
  tone: KIND_TONES[step.kind],
  kind: step.kind === 'script' ? step.shell : t(blueprintMessages.kindCommand),
  preview: stepPreview(step),
  problem: problemOf(step),
  ...envCounts(step),
  workingDir: step.workingDir,
});

/** A space is invisible between quotes: it is shown as `␣`. */
const quoted = (character: string) => `"${character === ' ' ? '␣' : character}"`;

/** Says what is wrong in the id, and what the server accepts. */
export const nodeIdIssueText = (issue: NodeIdIssue): string => {
  switch (issue.kind) {
    case 'empty':
      return t(blueprintMessages.idEmpty);
    case 'invalid-characters':
      return t(blueprintMessages.idInvalidCharacters(issue.characters.map(quoted).join(', ')));
    case 'too-long':
      return t(blueprintMessages.idTooLong(issue.length));
  }
};

const problemOf = (step: PipelineStep): StepSummary['problem'] => {
  const idIssue = nodeIdIssue(step.id);
  if (idIssue) return { label: t(blueprintMessages.invalidId), detail: nodeIdIssueText(idIssue) };

  const issue = stepIssue(step);
  if (!issue) return null;
  const text = t(ISSUE_MESSAGES[issue]);
  return { label: text, detail: text };
};

export const handleClass = (summary: StepSummary, selected: boolean) =>
  cn('size-2.5! border-[1.5px]! bg-card!', selected ? summary.tone.handle : 'border-input!');

export const ISSUE_MESSAGES: Record<StepIssue, MessageDescriptor> = {
  'missing-command': blueprintMessages.missingCommand,
  'empty-script': blueprintMessages.emptyScript,
};
