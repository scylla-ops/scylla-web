// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { isAgentOffline, isTourVisible, stepCount } from '../tour.presenter.ts';

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

describe('stepCount', () => {
  it('counts only the steps that point at the page', () => {
    expect(stepCount(['dashboard', 'new-agent'], 'new-agent')).toEqual({ step: 2, total: 2 });
    expect(stepCount(['dashboard', 'new-agent'], 'welcome')).toBeNull();
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
