/** What stops a step from running. The node and the inspector both show it. */
export type StepIssue = 'missing-command' | 'empty-script';

export type NodeIdIssue =
  | { kind: 'empty' }
  | { kind: 'invalid-characters'; characters: string[] }
  | { kind: 'too-long'; length: number };

export type PipelineNameIssue = 'empty' | 'spaces';

/** What stops a pipeline from being saved. */
export type PipelineIssue =
  | { kind: 'name'; issue: PipelineNameIssue }
  | { kind: 'step-ids'; ids: string[] };
