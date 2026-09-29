// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { StoredOnboardingMapper } from '../stored-onboarding.mapper.ts';

describe('StoredOnboardingMapper', () => {
  it('reads a user who never saw the tour as not started', () => {
    expect(StoredOnboardingMapper.toStatus(null)).toEqual({ kind: 'not-started' });
  });

  it('round-trips every status, with the subject of a tour in progress', () => {
    const statuses = [
      { kind: 'not-started' },
      { kind: 'in-progress', step: 'new-agent' },
      { kind: 'in-progress', step: 'wait-job', subject: { pipelineId: 'p-1', pipelineName: 'ci' } },
      { kind: 'completed' },
      { kind: 'skipped' },
    ] as const;

    for (const status of statuses) {
      expect(StoredOnboardingMapper.toStatus(StoredOnboardingMapper.toStored(status))).toEqual(
        status,
      );
    }
  });

  it('shows the tour again rather than trusting a value it cannot read', () => {
    for (const raw of ['{', '42', 'null', '{"kind":"paused"}', '{"kind":"in-progress"}']) {
      expect(StoredOnboardingMapper.toStatus(raw)).toEqual({ kind: 'not-started' });
    }
  });

  it('drops the fields of a subject that are not strings', () => {
    const raw = JSON.stringify({
      kind: 'in-progress',
      step: 'run-pipeline',
      subject: { pipelineId: 7 },
    });

    expect(StoredOnboardingMapper.toStatus(raw)).toEqual({
      kind: 'in-progress',
      step: 'run-pipeline',
      subject: {},
    });
  });
});
