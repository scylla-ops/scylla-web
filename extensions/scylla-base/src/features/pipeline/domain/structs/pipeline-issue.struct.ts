import type { PipelineNameIssue } from './pipeline-name.struct.ts';

/** What stops a step from running. The node and the inspector both show it. */
export type StepIssue = 'missing-command' | 'empty-script';

/** What stops a pipeline from being saved. */
export type PipelineIssue =
  | { kind: 'name'; issue: PipelineNameIssue }
  | { kind: 'step-ids'; ids: string[] };
