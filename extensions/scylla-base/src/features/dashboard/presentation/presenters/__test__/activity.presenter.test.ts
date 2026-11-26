import { describe, it, expect } from 'vitest';
import type { ActivityEvent } from '@base/features/dashboard/domain/structs/activity.struct.ts';
import { activityLine, activityLook, type ActivityActors } from '../activity.presenter.ts';

const event = (overrides: Partial<ActivityEvent> = {}): ActivityEvent => ({
  id: 'e1',
  kind: 'member.joined',
  area: 'members',
  actorId: 'u2',
  actorName: 'Paul',
  projectId: '',
  projectName: '',
  subjectKind: 'user',
  subjectId: 'u2',
  params: {},
  at: '2026-11-26T10:00:00Z',
  ...overrides,
});

const ACTORS: ActivityActors = {
  agents: [
    { id: 'a1', name: 'prod-runner', icon: { kind: 'glyph', name: 'cpu', color: '#3366cc' } },
  ],
  members: [
    {
      actorId: 'u2',
      actorKind: 'user',
      runner: false,
      displayName: 'Paul',
      handle: 'paul',
      avatarColor: '#aa3322',
    },
    {
      actorId: 'b1',
      actorKind: 'app',
      runner: false,
      displayName: 'Deploy bot',
      handle: 'bot',
      avatarGlyph: 'rocket',
    },
  ],
  self: { id: 'u1', username: 'marie', displayName: 'Marie', avatarUrl: '/marie.png' },
};

const lookOf = (overrides: Partial<ActivityEvent>, actors = ACTORS) => {
  const item = event(overrides);
  return activityLook(item, activityLine(item).mark, actors);
};

describe('activityLook', () => {
  it('shows the photo of the reader, as a solid avatar', () => {
    expect(lookOf({ actorId: 'u1', actorName: 'Marie' })).toEqual({
      kind: 'person',
      profile: ACTORS.self,
      self: true,
    });
  });

  it('shows the color that another member chose', () => {
    expect(lookOf({})).toEqual({
      kind: 'person',
      profile: {
        displayName: 'Paul',
        username: 'paul',
        avatarColor: '#aa3322',
        avatarUrl: undefined,
        avatarGlyph: undefined,
      },
      self: false,
    });
  });

  it('shows an app actor with the icon of the app', () => {
    expect(lookOf({ actorId: 'b1' })).toMatchObject({
      kind: 'app',
      profile: { avatarGlyph: 'rocket' },
    });
  });

  it('shows the icon of the agent of a connection', () => {
    expect(
      lookOf({
        kind: 'agent.connected',
        area: 'agents',
        actorId: undefined,
        subjectKind: 'app',
        subjectId: 'a1',
        params: { name: 'prod-runner' },
      }),
    ).toEqual({
      kind: 'agent',
      profile: {
        username: '',
        displayName: 'prod-runner',
        avatarGlyph: 'cpu',
        avatarColor: '#3366cc',
      },
      self: false,
    });
  });

  it('keeps the initial for an actor that the dashboard does not know', () => {
    expect(lookOf({ actorId: 'u9' })).toBeUndefined();
    expect(lookOf({ actorId: undefined })).toBeUndefined();
    expect(lookOf({}, { agents: [], members: [] })).toBeUndefined();
  });

  it('shows no avatar for a job line: its mark is the status', () => {
    expect(
      lookOf({ kind: 'job.ended', area: 'jobs', params: { status: 'completed' } }),
    ).toBeUndefined();
  });
});
