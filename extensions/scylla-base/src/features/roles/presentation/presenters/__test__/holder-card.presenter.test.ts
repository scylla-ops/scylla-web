import { describe, expect, it } from 'vitest';
import type { RoleHolderEntry } from '../../../domain/entities/role.entity.ts';
import { holderCard } from '../holder-card.presenter.ts';

const grant = (actorId: string, over: Partial<RoleHolderEntry> = {}): RoleHolderEntry => ({
  actorId,
  actorKind: 'user',
  displayName: actorId,
  handle: actorId,
  runner: false,
  scopeKind: 'workspace',
  scopeId: 'w-1',
  scopeName: "Seb's home",
  ...over,
});

const onProject = (actorId: string, project: string, over: Partial<RoleHolderEntry> = {}) =>
  grant(actorId, { scopeKind: 'project', scopeId: project, scopeName: project, ...over });

describe('holderCard', () => {
  it('counts the actors by kind in the heading', () => {
    const holders = [
      grant('marie'),
      grant('build-agent', { actorKind: 'app', runner: true }),
      grant('github-ci', { actorKind: 'app' }),
      grant('julie'),
    ];

    const card = holderCard({ holders, total: 4 }, { slug: 'acme', workspaceId: 'w-1' });

    expect(card.heading).toBe('2 people · 1 agent · 1 app');
    expect(card.rows.map(row => row.kind)).toEqual(['person', 'agent', 'app', 'person']);
  });

  it('gives one row to an actor, with the workspace when it covers the projects', () => {
    const holders = [onProject('marie', 'web'), grant('marie'), onProject('marie', 'api')];

    const card = holderCard({ holders, total: 3 }, { slug: 'acme', workspaceId: 'w-1' });

    expect(card.rows).toHaveLength(1);
    expect(card.rows[0].scope).toBe("Seb's home");
    expect(card.heading).toBe('1 person');
  });

  it('names the one project of an actor, and counts several projects', () => {
    const holders = [
      onProject('agent', 'api-gateway', { actorKind: 'app', runner: true }),
      onProject('ci', 'web', { actorKind: 'app' }),
      onProject('ci', 'api'),
      onProject('ci', 'docs'),
    ];

    const [agent, ci] = holderCard(
      { holders, total: 4 },
      { slug: 'acme', workspaceId: 'w-1' },
    ).rows;

    expect(agent.scope).toBe('api-gateway');
    expect(ci.scope).toBe('3 projects');
  });

  it('keeps six rows and counts the other actors and the grants that the server did not send', () => {
    const holders = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(id => grant(id));

    const card = holderCard({ holders, total: 120 }, { slug: 'acme', workspaceId: 'w-1' });

    expect(card.rows.map(row => row.actorId)).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
    expect(card.more).toBe(2 + 112);
  });

  it('links each actor of a workspace to its page in the members', () => {
    const holders = [grant('u 1'), grant('ci', { actorKind: 'app' })];

    const card = holderCard({ holders, total: 2 }, { slug: 'acme', workspaceId: 'w-1' });

    expect(card.allHref).toBe('/acme/access/members');
    expect(card.rows.map(row => row.href)).toEqual([
      '/acme/access/members/u%201',
      '/acme/access/members/ci',
    ]);
  });

  it('links a person of the instance to the users, and an app to nothing', () => {
    const holders = [
      grant('admin', { scopeKind: 'platform', scopeId: '', scopeName: '' }),
      grant('ci', { actorKind: 'app' }),
    ];

    const card = holderCard({ holders, total: 2 }, { slug: 'acme' });

    expect(card.allHref).toBe('/acme/instance/users');
    expect(card.rows.map(row => row.href)).toEqual(['/acme/instance/users/admin', undefined]);
    expect(card.rows[0].scope).toBe('Instance');
  });

  it('links nothing for a reader who cannot open the page of the people', () => {
    const holders = [grant('admin'), grant('ci', { actorKind: 'app' })];

    const card = holderCard({ holders, total: 2 });

    expect(card.allHref).toBeUndefined();
    expect(card.rows.map(row => row.href)).toEqual([undefined, undefined]);
  });
});
