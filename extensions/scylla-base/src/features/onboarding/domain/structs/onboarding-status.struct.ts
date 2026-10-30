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

/** A removed step that a saved tour can still hold, and the step that took its place. */
const REPLACED_STEPS: ReadonlyMap<string, string> = new Map([['reveal-secret', 'copy-secret']]);

export const currentStepId = (
  status: OnboardingStatus,
  stepIds: readonly string[],
): string | null => {
  switch (status.kind) {
    case 'not-started':
      return stepIds[0] ?? null;
    case 'in-progress': {
      const step = REPLACED_STEPS.get(status.step) ?? status.step;
      return stepIds.includes(step) ? step : (stepIds[0] ?? null);
    }
    default:
      return null;
  }
};

/** `null` when `from` is no longer the current step: a repeated event moves the tour once. */
export const advanceTour = (
  status: OnboardingStatus,
  stepIds: readonly string[],
  from: string,
  subject?: OnboardingSubject,
): OnboardingStatus | null => {
  if (currentStepId(status, stepIds) !== from) return null;

  const next = stepIds[stepIds.indexOf(from) + 1];
  if (!next) return { kind: 'completed' };

  const previous = status.kind === 'in-progress' ? status.subject : undefined;
  const merged = subject || previous ? { ...previous, ...subject } : undefined;
  return merged
    ? { kind: 'in-progress', step: next, subject: merged }
    : { kind: 'in-progress', step: next };
};

export const rewindTour = (
  status: OnboardingStatus,
  stepIds: readonly string[],
  from: string,
  to: string,
): OnboardingStatus | null => {
  if (status.kind !== 'in-progress' || currentStepId(status, stepIds) !== from) return null;
  if (!stepIds.includes(to)) return null;
  return { ...status, step: to };
};

export const rememberSubject = (
  status: OnboardingStatus,
  found: OnboardingSubject,
): OnboardingStatus | null =>
  status.kind === 'in-progress' ? { ...status, subject: { ...status.subject, ...found } } : null;
