import type {
  OnboardingStatus,
  OnboardingSubject,
} from '../domain/structs/onboarding-status.struct.ts';

export const currentStepId = (
  status: OnboardingStatus,
  stepIds: readonly string[],
): string | null => {
  switch (status.kind) {
    case 'not-started':
      return stepIds[0] ?? null;
    case 'in-progress':
      return stepIds.includes(status.step) ? status.step : (stepIds[0] ?? null);
    default:
      return null;
  }
};

export const isTourVisible = (status: OnboardingStatus, canStart: boolean): boolean =>
  status.kind === 'in-progress' || (status.kind === 'not-started' && canStart);

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

export const stepCount = (
  spotStepIds: readonly string[],
  stepId: string,
): { step: number; total: number } | null => {
  const index = spotStepIds.indexOf(stepId);
  return index === -1 ? null : { step: index + 1, total: spotStepIds.length };
};

export const sameMutationKey = (
  key: readonly unknown[] | undefined,
  expected: readonly unknown[],
): boolean => !!key && JSON.stringify(key) === JSON.stringify(expected);
