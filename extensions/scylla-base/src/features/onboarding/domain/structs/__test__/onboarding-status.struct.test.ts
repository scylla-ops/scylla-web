// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  advanceTour,
  currentStepId,
  rememberSubject,
  rewindTour,
} from '../onboarding-status.struct.ts';

const STEPS = ['welcome', 'dashboard', 'new-agent', 'create-agent', 'finish'];

describe('currentStepId', () => {
  it('opens on the first step for a user who never started', () => {
    expect(currentStepId({ kind: 'not-started' }, STEPS)).toBe('welcome');
  });

  it('resumes at the saved step', () => {
    expect(currentStepId({ kind: 'in-progress', step: 'new-agent' }, STEPS)).toBe('new-agent');
  });

  it('restarts at the first step when the saved step no longer exists', () => {
    expect(currentStepId({ kind: 'in-progress', step: 'removed' }, STEPS)).toBe('welcome');
  });

  it('resumes a tour saved at the removed reveal-secret step at copy-secret, which replaced it', () => {
    const steps = ['welcome', 'create-agent', 'copy-secret', 'run-command', 'finish'];
    const saved = { kind: 'in-progress', step: 'reveal-secret' } as const;

    expect(currentStepId(saved, steps)).toBe('copy-secret');
    expect(advanceTour(saved, steps, 'copy-secret')).toEqual({
      kind: 'in-progress',
      step: 'run-command',
    });
  });

  it('has no step once the tour is completed or skipped', () => {
    expect(currentStepId({ kind: 'completed' }, STEPS)).toBeNull();
    expect(currentStepId({ kind: 'skipped' }, STEPS)).toBeNull();
  });
});

describe('advanceTour', () => {
  it('moves from the current step to the next one', () => {
    expect(advanceTour({ kind: 'not-started' }, STEPS, 'welcome')).toEqual({
      kind: 'in-progress',
      step: 'dashboard',
    });
  });

  it('ignores an event from a step that is no longer the current one', () => {
    const status = { kind: 'in-progress', step: 'create-agent' } as const;

    expect(advanceTour(status, STEPS, 'new-agent')).toBeNull();
  });

  it('completes the tour after its last step', () => {
    expect(advanceTour({ kind: 'in-progress', step: 'finish' }, STEPS, 'finish')).toEqual({
      kind: 'completed',
    });
  });

  it('keeps what the tour created and adds what the step found', () => {
    const status = {
      kind: 'in-progress',
      step: 'new-agent',
      subject: { pipelineName: 'ci' },
    } as const;

    expect(advanceTour(status, STEPS, 'new-agent', { pipelineId: 'p-1' })).toEqual({
      kind: 'in-progress',
      step: 'create-agent',
      subject: { pipelineName: 'ci', pipelineId: 'p-1' },
    });
  });
});

describe('rewindTour', () => {
  it('goes back to the step that brings the lost target', () => {
    const status = {
      kind: 'in-progress',
      step: 'create-agent',
      subject: { pipelineId: 'p' },
    } as const;

    expect(rewindTour(status, STEPS, 'create-agent', 'new-agent')).toEqual({
      kind: 'in-progress',
      step: 'new-agent',
      subject: { pipelineId: 'p' },
    });
  });

  it('does nothing for a stale step or an unknown destination', () => {
    const status = { kind: 'in-progress', step: 'create-agent' } as const;

    expect(rewindTour(status, STEPS, 'dashboard', 'welcome')).toBeNull();
    expect(rewindTour(status, STEPS, 'create-agent', 'nowhere')).toBeNull();
    expect(rewindTour({ kind: 'skipped' }, STEPS, 'create-agent', 'new-agent')).toBeNull();
  });
});

describe('rememberSubject', () => {
  it('keeps what the tour found without moving it', () => {
    const status = {
      kind: 'in-progress',
      step: 'reveal-secret',
      subject: { projectId: 'p' },
    } as const;

    expect(rememberSubject(status, { agentId: 'a-1' })).toEqual({
      kind: 'in-progress',
      step: 'reveal-secret',
      subject: { projectId: 'p', agentId: 'a-1' },
    });
    expect(rememberSubject({ kind: 'skipped' }, { agentId: 'a-1' })).toBeNull();
  });
});
