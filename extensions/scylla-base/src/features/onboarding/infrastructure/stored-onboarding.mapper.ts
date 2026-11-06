import {
  NOT_STARTED,
  type OnboardingStatus,
  type OnboardingSubject,
} from '@base/features/onboarding/domain/structs/onboarding-status.struct.ts';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const toSubject = (value: unknown): OnboardingSubject | undefined => {
  if (!isRecord(value)) return undefined;
  const subject: OnboardingSubject = {};
  if (typeof value.agentId === 'string') subject.agentId = value.agentId;
  if (typeof value.projectId === 'string') subject.projectId = value.projectId;
  if (typeof value.pipelineName === 'string') subject.pipelineName = value.pipelineName;
  if (typeof value.pipelineId === 'string') subject.pipelineId = value.pipelineId;
  return subject;
};

const toTours = (value: unknown): readonly string[] =>
  Array.isArray(value) ? value.filter(tour => typeof tour === 'string') : [];

const withOptional = <T extends object>(
  value: T,
  subject: OnboardingSubject | undefined,
  done: readonly string[],
  declined: readonly string[],
) => ({
  ...value,
  ...(subject ? { subject } : {}),
  ...(done.length > 0 ? { done } : {}),
  ...(declined.length > 0 ? { declined } : {}),
});

export function toStatus(raw: string | null): OnboardingStatus {
  if (raw === null) return NOT_STARTED;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return NOT_STARTED;
  }
  if (!isRecord(parsed)) return NOT_STARTED;

  const subject = toSubject(parsed.subject);
  const done = toTours(parsed.done);
  const declined = toTours(parsed.declined);
  switch (parsed.kind) {
    case 'not-started':
      return withOptional({ kind: 'not-started' }, undefined, done, declined);
    case 'completed':
    case 'skipped':
      return withOptional({ kind: parsed.kind }, subject, done, declined);
    case 'finished':
      if (typeof parsed.tour !== 'string') {
        return withOptional({ kind: 'completed' }, subject, done, declined);
      }
      return {
        ...withOptional({ kind: 'finished', tour: parsed.tour }, subject, [], declined),
        done,
      };
    case 'in-progress': {
      if (typeof parsed.step !== 'string') return NOT_STARTED;
      const tour = typeof parsed.tour === 'string' ? { tour: parsed.tour } : {};
      return withOptional(
        { kind: 'in-progress', ...tour, step: parsed.step },
        subject,
        done,
        declined,
      );
    }
    default:
      return NOT_STARTED;
  }
}

export function toStored(status: OnboardingStatus): string {
  return JSON.stringify(status);
}
