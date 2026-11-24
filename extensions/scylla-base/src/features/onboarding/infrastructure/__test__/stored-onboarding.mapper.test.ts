// @vitest-environment node
import { describe, it, expect } from 'vitest';
import * as storedOnboarding from '../stored-onboarding.mapper.ts';

describe('storedOnboarding', () => {
  it('reads a user who never saw the tour as not started', () => {
    expect(storedOnboarding.toStatus(null)).toEqual({ kind: 'not-started' });
  });

  it('round-trips every status, with the subject of a tour in progress', () => {
    const statuses = [
      { kind: 'not-started' },
      { kind: 'in-progress', step: 'new-agent' },
      {
        kind: 'in-progress',
        step: 'wait-job',
        subject: { projectId: 'pr-1', pipelineId: 'p-1', pipelineName: 'ci' },
      },
      { kind: 'in-progress', tour: 'agent', step: 'new-agent', done: ['run'] },
      { kind: 'finished', tour: 'agent', done: ['agent'], subject: { agentId: 'a-1' } },
      { kind: 'completed' },
      { kind: 'completed', done: ['agent', 'run'] },
      { kind: 'skipped', subject: { projectId: 'pr-1' } },
      { kind: 'skipped', declined: ['roles'] },
      { kind: 'not-started', done: ['agent'], declined: ['users'] },
      { kind: 'finished', tour: 'run', done: ['run'], declined: ['roles'] },
    ] as const;

    for (const status of statuses) {
      expect(storedOnboarding.toStatus(storedOnboarding.toStored(status))).toEqual(status);
    }
  });

  it('shows the tour again rather than trusting a value it cannot read', () => {
    for (const raw of ['{', '42', 'null', '{"kind":"paused"}', '{"kind":"in-progress"}']) {
      expect(storedOnboarding.toStatus(raw)).toEqual({ kind: 'not-started' });
    }
  });

  it('drops the fields of a subject that are not strings', () => {
    const raw = JSON.stringify({
      kind: 'in-progress',
      step: 'run-pipeline',
      subject: { pipelineId: 7 },
    });

    expect(storedOnboarding.toStatus(raw)).toEqual({
      kind: 'in-progress',
      step: 'run-pipeline',
      subject: {},
    });
  });

  it('keeps only the names of the finished tours', () => {
    const raw = JSON.stringify({ kind: 'skipped', done: ['agent', 3, null, 'run'] });

    expect(storedOnboarding.toStatus(raw)).toEqual({ kind: 'skipped', done: ['agent', 'run'] });
  });

  it('closes a finished tour that lost its name', () => {
    expect(storedOnboarding.toStatus('{"kind":"finished","done":["agent"]}')).toEqual({
      kind: 'completed',
      done: ['agent'],
    });
  });
});
