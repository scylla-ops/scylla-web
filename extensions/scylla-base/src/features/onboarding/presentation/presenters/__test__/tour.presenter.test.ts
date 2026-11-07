// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  isAgentOffline,
  isOnPage,
  offeredTour,
  stepCount,
  tourView,
  workspacePath,
} from '../tour.presenter.ts';

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

describe('isOnPage', () => {
  it('compares the path in the workspace, with or without a trailing slash', () => {
    expect(isOnPage('/acme/agents', '/agents')).toBe(true);
    expect(isOnPage('/acme/agents/', '/agents')).toBe(true);
  });

  it('does not take a page below it for the page', () => {
    expect(isOnPage('/acme/agents/a-1', '/agents')).toBe(false);
    expect(isOnPage('/acme/projects', '/agents')).toBe(false);
  });
});

describe('offeredTour', () => {
  const tours = [
    { id: 'agent', permissions: ['agents'], offer: { path: /^\/agents\/?$/ } },
    {
      id: 'secrets',
      permissions: [],
      offer: {
        path: /^\/projects\/([^/]+)\/secrets$/,
        subject: ([, projectId]: RegExpMatchArray) => ({ projectId }),
      },
    },
    { id: 'run', permissions: [] },
  ];
  const all = () => true;

  it('reads the path of the page without the workspace', () => {
    expect(workspacePath('/acme/projects/p-1')).toBe('/projects/p-1');
    expect(workspacePath('/acme')).toBe('/');
  });

  it('offers the tour of the page, with what the page shows', () => {
    expect(offeredTour(tours, '/acme/agents', { kind: 'skipped' }, all)?.tour.id).toBe('agent');
    expect(offeredTour(tours, '/acme/projects/p-1/secrets', { kind: 'completed' }, all)).toEqual({
      tour: tours[1],
      subject: { projectId: 'p-1' },
    });
    expect(offeredTour(tours, '/acme/projects', { kind: 'skipped' }, all)).toBeUndefined();
  });

  it('offers no tour that is done, turned down or out of reach', () => {
    expect(
      offeredTour(tours, '/acme/agents', { kind: 'skipped', done: ['agent'] }, all),
    ).toBeUndefined();
    expect(
      offeredTour(tours, '/acme/agents', { kind: 'skipped', declined: ['agent'] }, all),
    ).toBeUndefined();
    expect(offeredTour(tours, '/acme/agents', { kind: 'skipped' }, () => false)).toBeUndefined();
  });

  it('offers nothing while a tour runs or its end shows', () => {
    expect(
      offeredTour(tours, '/acme/agents', { kind: 'in-progress', step: 'new-agent' }, all),
    ).toBeUndefined();
    expect(
      offeredTour(tours, '/acme/agents', { kind: 'finished', tour: 'run', done: ['run'] }, all),
    ).toBeUndefined();
  });
});
