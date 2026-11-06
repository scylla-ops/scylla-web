// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  advanceTour,
  closeTours,
  currentStepId,
  declineTour,
  doneTours,
  previousStepId,
  rememberSubject,
  reopenIntro,
  rewindTour,
  startTour,
} from '../onboarding-status.struct.ts';

const STEPS = ['open-agents', 'new-agent', 'create-agent', 'run-command', 'agent-page'];

describe('currentStepId', () => {
  it('has no step before a tour starts', () => {
    expect(currentStepId({ kind: 'not-started' }, STEPS)).toBeNull();
  });

  it('resumes at the saved step', () => {
    expect(currentStepId({ kind: 'in-progress', tour: 'agent', step: 'new-agent' }, STEPS)).toBe(
      'new-agent',
    );
  });

  it('restarts at the first step when the saved step no longer exists', () => {
    expect(currentStepId({ kind: 'in-progress', step: 'removed' }, STEPS)).toBe('open-agents');
  });

  it('resumes a step of the old single tour at the step that replaced it', () => {
    expect(currentStepId({ kind: 'in-progress', step: 'connect-agent' }, STEPS)).toBe(
      'agent-page',
    );
    expect(currentStepId({ kind: 'in-progress', step: 'navbar' }, STEPS)).toBe('open-agents');
    expect(currentStepId({ kind: 'in-progress', step: 'reveal-secret' }, STEPS)).toBe(
      'run-command',
    );
  });

  it('has no step once the tours are closed or a tour is finished', () => {
    expect(currentStepId({ kind: 'completed' }, STEPS)).toBeNull();
    expect(currentStepId({ kind: 'skipped' }, STEPS)).toBeNull();
    expect(currentStepId({ kind: 'finished', tour: 'agent', done: ['agent'] }, STEPS)).toBeNull();
  });
});

describe('startTour', () => {
  it('starts a tour and keeps what the earlier tours made and finished', () => {
    const status = {
      kind: 'completed',
      subject: { projectId: 'p' },
      done: ['agent'],
    } as const;

    expect(startTour(status, 'run', 'run-pipeline')).toEqual({
      kind: 'in-progress',
      tour: 'run',
      step: 'run-pipeline',
      subject: { projectId: 'p' },
      done: ['agent'],
    });
    expect(startTour({ kind: 'not-started' }, 'agent', 'open-agents')).toEqual({
      kind: 'in-progress',
      tour: 'agent',
      step: 'open-agents',
    });
  });
});

describe('startTour from a page', () => {
  it('starts with what the page shows and keeps the turned down tours', () => {
    const status = { kind: 'skipped', subject: { projectId: 'old' }, declined: ['roles'] } as const;

    expect(startTour(status, 'secrets', 'new-secret', { projectId: 'p-2' })).toEqual({
      kind: 'in-progress',
      tour: 'secrets',
      step: 'new-secret',
      subject: { projectId: 'p-2' },
      declined: ['roles'],
    });
  });
});

describe('advanceTour', () => {
  it('moves from the current step to the next one', () => {
    expect(
      advanceTour({ kind: 'in-progress', tour: 'agent', step: 'open-agents' }, STEPS, 'open-agents'),
    ).toEqual({ kind: 'in-progress', tour: 'agent', step: 'new-agent' });
  });

  it('ignores an event from a step that is no longer the current one', () => {
    const status = { kind: 'in-progress', step: 'create-agent' } as const;

    expect(advanceTour(status, STEPS, 'new-agent')).toBeNull();
    expect(advanceTour({ kind: 'not-started' }, STEPS, 'open-agents')).toBeNull();
  });

  it('finishes the tour after its last step and counts it as done', () => {
    expect(
      advanceTour(
        { kind: 'in-progress', tour: 'agent', step: 'agent-page', done: ['run'] },
        STEPS,
        'agent-page',
      ),
    ).toEqual({ kind: 'finished', tour: 'agent', done: ['run', 'agent'] });
  });

  it('keeps what the tour created and adds what the step found', () => {
    const status = {
      kind: 'in-progress',
      tour: 'agent',
      step: 'new-agent',
      subject: { pipelineName: 'ci' },
    } as const;

    expect(advanceTour(status, STEPS, 'new-agent', { pipelineId: 'p-1' })).toEqual({
      kind: 'in-progress',
      tour: 'agent',
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

    expect(rewindTour(status, STEPS, 'open-agents', 'new-agent')).toBeNull();
    expect(rewindTour(status, STEPS, 'create-agent', 'nowhere')).toBeNull();
    expect(rewindTour({ kind: 'skipped' }, STEPS, 'create-agent', 'new-agent')).toBeNull();
  });
});

describe('previousStepId', () => {
  it('gives the step before, and none for the first one', () => {
    expect(previousStepId(STEPS, 'create-agent')).toBe('new-agent');
    expect(previousStepId(STEPS, 'open-agents')).toBeNull();
    expect(previousStepId(STEPS, 'unknown')).toBeNull();
  });
});

describe('closeTours', () => {
  it('closes the tours and keeps the ones that are done', () => {
    const status = { kind: 'finished', tour: 'agent', done: ['agent'] } as const;

    expect(closeTours(status, 'completed')).toEqual({ kind: 'completed', done: ['agent'] });
    expect(closeTours({ kind: 'not-started' }, 'skipped')).toEqual({ kind: 'skipped' });
    expect(doneTours(closeTours(status, 'skipped'))).toEqual(['agent']);
  });
});

describe('declineTour', () => {
  it('turns down the offer of a page once, outside of a tour', () => {
    expect(declineTour({ kind: 'skipped', done: ['agent'] }, 'roles')).toEqual({
      kind: 'skipped',
      done: ['agent'],
      declined: ['roles'],
    });
    expect(declineTour({ kind: 'not-started' }, 'roles')).toEqual({
      kind: 'not-started',
      declined: ['roles'],
    });
    expect(declineTour({ kind: 'completed', declined: ['roles'] }, 'roles')).toBeNull();
    expect(declineTour({ kind: 'in-progress', step: 'new-agent' }, 'roles')).toBeNull();
  });

  it('keeps the turned down tours through a tour and its end', () => {
    const started = startTour({ kind: 'skipped', declined: ['roles'] }, 'agent', 'agent-page');
    const finished = advanceTour(started, STEPS, 'agent-page');

    expect(finished).toEqual({
      kind: 'finished',
      tour: 'agent',
      done: ['agent'],
      declined: ['roles'],
    });
    expect(finished && closeTours(finished, 'completed')).toEqual({
      kind: 'completed',
      done: ['agent'],
      declined: ['roles'],
    });
  });
});

describe('reopenIntro', () => {
  it('shows the welcome dialog again and keeps the history of the tours', () => {
    expect(reopenIntro({ kind: 'completed', done: ['agent'], declined: ['roles'] })).toEqual({
      kind: 'not-started',
      done: ['agent'],
      declined: ['roles'],
    });
  });
});

describe('rememberSubject', () => {
  it('keeps what the tour found without moving it', () => {
    const status = {
      kind: 'in-progress',
      step: 'run-command',
      subject: { projectId: 'p' },
    } as const;

    expect(rememberSubject(status, { agentId: 'a-1' })).toEqual({
      kind: 'in-progress',
      step: 'run-command',
      subject: { projectId: 'p', agentId: 'a-1' },
    });
    expect(rememberSubject({ kind: 'skipped' }, { agentId: 'a-1' })).toBeNull();
  });
});
