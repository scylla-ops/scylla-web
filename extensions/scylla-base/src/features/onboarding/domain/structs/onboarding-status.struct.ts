export interface OnboardingSubject {
  agentId?: string;
  projectId?: string;
  pipelineName?: string;
  pipelineId?: string;
}

export type OnboardingStatus =
  | { kind: 'not-started' }
  | { kind: 'in-progress'; step: string; subject?: OnboardingSubject }
  | { kind: 'completed' }
  | { kind: 'skipped' };

export const NOT_STARTED: OnboardingStatus = { kind: 'not-started' };
