// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { isAgentOffline, stepCount, tourView } from '../tour.presenter.ts';

describe('tourView', () => {
  it('welcomes on its own only a user who may do what the tours ask', () => {
    expect(tourView({ kind: 'not-started' }, false, true)).toBe('intro');
    expect(tourView({ kind: 'not-started' }, false, false)).toBe('none');
  });

  it('keeps a tour in progress on screen even while the permissions reload', () => {
    expect(tourView({ kind: 'in-progress', step: 'new-agent' }, true, false)).toBe('spot');
    expect(tourView({ kind: 'in-progress', step: 'new-agent' }, false, true)).toBe('none');
  });

  it('shows the end of a finished tour, then nothing once closed', () => {
    expect(tourView({ kind: 'finished', tour: 'agent', done: ['agent'] }, false, true)).toBe(
      'finish',
    );
    expect(tourView({ kind: 'completed' }, false, true)).toBe('none');
    expect(tourView({ kind: 'skipped' }, false, true)).toBe('none');
  });
});

describe('stepCount', () => {
  it('counts the steps of the tour', () => {
    expect(stepCount(['open-agents', 'new-agent'], 'new-agent')).toEqual({ step: 2, total: 2 });
    expect(stepCount(['open-agents', 'new-agent'], 'welcome')).toBeNull();
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
