import type { MessageDescriptor } from '@lingui/core';
import type { LucideIcon } from '@scylla/ui';
import { t } from '@scylla/ui/i18n';
import { cn } from '@scylla/ui/utils';
import type { PipelineStep } from '@base/features/pipeline/domain/structs/pipeline.struct.ts';
import {
  envCounts,
  stepIssue,
  stepPreview,
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
  issue: StepIssue | null;
  variables: number;
  secrets: number;
  workingDir?: string;
}

export interface StepNodeViewProps {
  step: PipelineStep;
  selected: boolean;
  summary: StepSummary;
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
  issue: stepIssue(step),
  ...envCounts(step),
  workingDir: step.workingDir,
});

export const handleClass = (summary: StepSummary, selected: boolean) =>
  cn('size-2.5! border-[1.5px]! bg-card!', selected ? summary.tone.handle : 'border-input!');

export const ISSUE_MESSAGES: Record<StepIssue, MessageDescriptor> = {
  'missing-command': blueprintMessages.missingCommand,
  'empty-script': blueprintMessages.emptyScript,
};
