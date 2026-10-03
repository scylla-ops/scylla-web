// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  advanceTour,
  currentStepId,
  isAgentOffline,
  isTourVisible,
  rememberSubject,
  rewindTour,
  sameMutationKey,
  stepCount,
} from '../tour-machine.calculator.ts';

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

  it('has no step once the tour is completed or skipped', () => {
    expect(currentStepId({ kind: 'completed' }, STEPS)).toBeNull();
    expect(currentStepId({ kind: 'skipped' }, STEPS)).toBeNull();
  });
});

describe('isTourVisible', () => {
  it('starts on its own only for a user who may do what it asks', () => {
    expect(isTourVisible({ kind: 'not-started' }, true)).toBe(true);
    expect(isTourVisible({ kind: 'not-started' }, false)).toBe(false);
  });

  it('keeps a tour in progress on screen even while the permissions reload', () => {
    expect(isTourVisible({ kind: 'in-progress', step: 'dashboard' }, false)).toBe(true);
  });

  it('never shows again once completed or skipped', () => {
    expect(isTourVisible({ kind: 'completed' }, true)).toBe(false);
    expect(isTourVisible({ kind: 'skipped' }, true)).toBe(false);
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

describe('stepCount', () => {
  it('counts only the steps that point at the page', () => {
    expect(stepCount(['dashboard', 'new-agent'], 'new-agent')).toEqual({ step: 2, total: 2 });
    expect(stepCount(['dashboard', 'new-agent'], 'welcome')).toBeNull();
  });
});

describe('sameMutationKey', () => {
  it('matches a mutation by the value of its key', () => {
    expect(sameMutationKey(['project', 'create'], ['project', 'create'])).toBe(true);
    expect(sameMutationKey(['project', 'update'], ['project', 'create'])).toBe(false);
    expect(sameMutationKey(undefined, ['project', 'create'])).toBe(false);
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

describe('isAgentOffline', () => {
  const agents = [
    { id: 'mine', connected: false },
    { id: 'other', connected: true },
  ];

  it('watches the agent the user created in the tour', () => {
    expect(isAgentOffline(agents, 'mine')).toBe(true);
    expect(isAgentOffline(agents, 'other')).toBe(false);
  });

  it('is happy with any connected agent when the tour did not create one', () => {
    expect(isAgentOffline(agents, undefined)).toBe(false);
    expect(isAgentOffline([{ id: 'x', connected: false }], undefined)).toBe(true);
  });

  it('says nothing while the agents are unknown or gone', () => {
    expect(isAgentOffline(undefined, 'mine')).toBe(false);
    expect(isAgentOffline([], 'mine')).toBe(false);
    expect(isAgentOffline(agents, 'deleted')).toBe(false);
  });
});
