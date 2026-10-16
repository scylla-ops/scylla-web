import type { MessageDescriptor } from '@lingui/core';
import type { PipelineStep } from '@base/features/pipeline/domain/structs/pipeline.struct.ts';
import { definitionOf } from '@base/features/pipeline/presentation/utils/blueprint-converter.ts';
import {
  envCounts,
  stepIssue,
  stepPreview,
  type StepIssue,
} from '@base/features/pipeline/presentation/utils/step-summary.ts';
import { blueprintMessages } from '../blueprint.messages.ts';

/** What every node appearance renders: computed once, so the views only lay it out. */
export interface StepSummary {
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

export const summarize = (step: PipelineStep): StepSummary => {
  const definition = definitionOf(step);
  return {
    preview: stepPreview(definition),
    issue: stepIssue(definition),
    ...envCounts(definition),
    workingDir: step.workingDir,
  };
};

/** The kind is told by colour and icon together, never by colour alone. */
export const KIND_TONES: Record<
  PipelineStep['kind'],
  { text: string; tile: string; border: string; ring: string; handle: string }
> = {
  script: {
    text: 'text-primary',
    tile: 'bg-primary/12',
    border: 'border-primary',
    ring: 'ring-primary/20',
    handle: 'border-primary!',
  },
  exec: {
    text: 'text-chart-2',
    tile: 'bg-chart-2/12',
    border: 'border-chart-2',
    ring: 'ring-chart-2/25',
    handle: 'border-chart-2!',
  },
};

export const ISSUE_MESSAGES: Record<StepIssue, MessageDescriptor> = {
  'missing-command': blueprintMessages.missingCommand,
  'empty-script': blueprintMessages.emptyScript,
};

/** `bash` and `sh` are names, not words: only `command` is translated. */
export const kindLabel = (step: PipelineStep): string | MessageDescriptor =>
  step.kind === 'script' ? step.shell : blueprintMessages.kindCommand;
