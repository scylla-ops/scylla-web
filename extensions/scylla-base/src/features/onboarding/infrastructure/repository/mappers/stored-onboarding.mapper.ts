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
  if (typeof value.pipelineName === 'string') subject.pipelineName = value.pipelineName;
  if (typeof value.pipelineId === 'string') subject.pipelineId = value.pipelineId;
  return subject;
};

export class StoredOnboardingMapper {
  static toStatus(raw: string | null): OnboardingStatus {
    if (raw === null) return NOT_STARTED;

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NOT_STARTED;
    }
    if (!isRecord(parsed)) return NOT_STARTED;

    switch (parsed.kind) {
      case 'completed':
      case 'skipped':
        return { kind: parsed.kind };
      case 'in-progress': {
        if (typeof parsed.step !== 'string') return NOT_STARTED;
        const subject = toSubject(parsed.subject);
        return subject
          ? { kind: 'in-progress', step: parsed.step, subject }
          : { kind: 'in-progress', step: parsed.step };
      }
      default:
        return NOT_STARTED;
    }
  }

  static toStored(status: OnboardingStatus): string {
    return JSON.stringify(status);
  }
}
