export interface OnboardingSubject {
  agentId?: string;
  projectId?: string;
  pipelineName?: string;
  pipelineId?: string;
}

/** The tours that the user finished (`done`) and the page offers they turned down (`declined`). */
export interface TourHistory {
  done?: readonly string[];
  declined?: readonly string[];
}

export type OnboardingStatus =
  | ({ kind: 'not-started' } & TourHistory)
  | ({
      kind: 'in-progress';
      tour?: string;
      step: string;
      subject?: OnboardingSubject;
    } & TourHistory)
  | ({ kind: 'finished'; tour: string; subject?: OnboardingSubject; done: readonly string[] } & Omit<
      TourHistory,
      'done'
    >)
  | ({ kind: 'completed'; subject?: OnboardingSubject } & TourHistory)
  | ({ kind: 'skipped'; subject?: OnboardingSubject } & TourHistory);

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

export const doneTours = (status: OnboardingStatus): readonly string[] => status.done ?? [];

export const declinedTours = (status: OnboardingStatus): readonly string[] =>
  status.declined ?? [];

const keptSubject = (status: OnboardingStatus): OnboardingSubject | undefined =>
  status.kind === 'not-started' ? undefined : status.subject;

const withSubject = <T extends object>(value: T, subject: OnboardingSubject | undefined) =>
  subject ? { ...value, subject } : value;

const withHistory = <T extends object>(
  value: T,
  done: readonly string[],
  declined: readonly string[],
) => ({
  ...value,
  ...(done.length > 0 ? { done } : {}),
  ...(declined.length > 0 ? { declined } : {}),
});

const keptHistory = <T extends object>(value: T, status: OnboardingStatus) =>
  withHistory(value, doneTours(status), declinedTours(status));

const union = (left: readonly string[], right: readonly string[]) => [
  ...new Set([...left, ...right]),
];

/**
 * Two devices changed the status. The tours that one finished or turned down stay. The tour of the
 * server stays, so a stale device cannot bring back a closed tour.
 */
export const mergeStatuses = (server: OnboardingStatus, local: OnboardingStatus): OnboardingStatus =>
  withHistory(
    server.kind === 'not-started' ? local : server,
    union(doneTours(server), doneTours(local)),
    union(declinedTours(server), declinedTours(local)),
  ) as OnboardingStatus;

/** `found` is what the page that starts the tour already shows, as its project. */
export const startTour = (
  status: OnboardingStatus,
  tour: string,
  firstStep: string,
  found?: OnboardingSubject,
): OnboardingStatus => {
  const kept = keptSubject(status);
  const subject = found && Object.keys(found).length > 0 ? { ...kept, ...found } : kept;
  return keptHistory(
    withSubject({ kind: 'in-progress' as const, tour, step: firstStep }, subject),
    status,
  );
};

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
    const finished = withSubject(
      { kind: 'finished' as const, tour, done: done.includes(tour) ? done : [...done, tour] },
      merged,
    );
    const declined = declinedTours(status);
    return declined.length > 0 ? { ...finished, declined } : finished;
  }
  const moved = {
    kind: 'in-progress' as const,
    ...(status.tour === undefined ? {} : { tour: status.tour }),
    step: next,
  };
  return keptHistory(withSubject(moved, merged), status);
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
): OnboardingStatus => keptHistory(withSubject({ kind }, keptSubject(status)), status);

/** Shows the welcome dialog again, and keeps the tours that are done or turned down. */
export const reopenIntro = (status: OnboardingStatus): OnboardingStatus =>
  keptHistory({ kind: 'not-started' as const }, status);

/** The user turned down the offer of a page: it does not come back, the help page still has it. */
export const declineTour = (status: OnboardingStatus, tour: string): OnboardingStatus | null => {
  const declined = declinedTours(status);
  if (declined.includes(tour) || status.kind === 'in-progress' || status.kind === 'finished') {
    return null;
  }
  return { ...status, declined: [...declined, tour] };
};

export const rememberSubject = (
  status: OnboardingStatus,
  found: OnboardingSubject,
): OnboardingStatus | null =>
  status.kind === 'in-progress' ? { ...status, subject: { ...status.subject, ...found } } : null;
