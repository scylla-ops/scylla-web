export interface OnboardingSubject {
  agentId?: string;
  projectId?: string;
  pipelineName?: string;
  pipelineId?: string;
}

export type OnboardingStatus =
  | { kind: 'not-started' }
  | {
      kind: 'in-progress';
      tour?: string;
      step: string;
      subject?: OnboardingSubject;
      done?: readonly string[];
    }
  | { kind: 'finished'; tour: string; subject?: OnboardingSubject; done: readonly string[] }
  | { kind: 'completed'; subject?: OnboardingSubject; done?: readonly string[] }
  | { kind: 'skipped'; subject?: OnboardingSubject; done?: readonly string[] };

export const NOT_STARTED: OnboardingStatus = { kind: 'not-started' };

/** A removed step that a saved tour can still hold, and the step that took its place. */
const REPLACED_STEPS: ReadonlyMap<string, string> = new Map([
  ['reveal-secret', 'run-command'],
  ['copy-secret', 'run-command'],
  ['dashboard', 'open-agents'],
  ['navbar', 'open-agents'],
  ['connect-agent', 'agent-page'],
  ['pipeline-editor', 'create-pipeline'],
]);

export const savedStepId = (status: OnboardingStatus): string | null =>
  status.kind === 'in-progress' ? (REPLACED_STEPS.get(status.step) ?? status.step) : null;

export const currentStepId = (
  status: OnboardingStatus,
  stepIds: readonly string[],
): string | null => {
  const step = savedStepId(status);
  if (step === null) return null;
  return stepIds.includes(step) ? step : (stepIds[0] ?? null);
};

export const doneTours = (status: OnboardingStatus): readonly string[] =>
  status.kind === 'not-started' ? [] : (status.done ?? []);

const keptSubject = (status: OnboardingStatus): OnboardingSubject | undefined =>
  status.kind === 'not-started' ? undefined : status.subject;

const withSubject = <T extends object>(value: T, subject: OnboardingSubject | undefined) =>
  subject ? { ...value, subject } : value;

const withDone = <T extends object>(value: T, done: readonly string[]) =>
  done.length > 0 ? { ...value, done } : value;

export const startTour = (
  status: OnboardingStatus,
  tour: string,
  firstStep: string,
): OnboardingStatus =>
  withDone(
    withSubject({ kind: 'in-progress' as const, tour, step: firstStep }, keptSubject(status)),
    doneTours(status),
  );

/** `null` when `from` is no longer the current step: a repeated event moves the tour once. */
export const advanceTour = (
  status: OnboardingStatus,
  stepIds: readonly string[],
  from: string,
  subject?: OnboardingSubject,
): OnboardingStatus | null => {
  if (status.kind !== 'in-progress' || currentStepId(status, stepIds) !== from) return null;

  const previous = status.subject;
  const merged = subject || previous ? { ...previous, ...subject } : undefined;
  const next = stepIds[stepIds.indexOf(from) + 1];
  if (!next) {
    const done = doneTours(status);
    const tour = status.tour ?? '';
    return withSubject(
      { kind: 'finished' as const, tour, done: done.includes(tour) ? done : [...done, tour] },
      merged,
    );
  }
  const moved = {
    kind: 'in-progress' as const,
    ...(status.tour === undefined ? {} : { tour: status.tour }),
    step: next,
  };
  return withDone(withSubject(moved, merged), doneTours(status));
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

export const previousStepId = (stepIds: readonly string[], from: string): string | null => {
  const index = stepIds.indexOf(from);
  return index > 0 ? (stepIds[index - 1] ?? null) : null;
};

export const closeTours = (
  status: OnboardingStatus,
  kind: 'completed' | 'skipped',
): OnboardingStatus => withDone(withSubject({ kind }, keptSubject(status)), doneTours(status));

export const rememberSubject = (
  status: OnboardingStatus,
  found: OnboardingSubject,
): OnboardingStatus | null =>
  status.kind === 'in-progress' ? { ...status, subject: { ...status.subject, ...found } } : null;
