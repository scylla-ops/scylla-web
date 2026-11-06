import { describe, expect, it } from 'vitest';
import { msg } from '@lingui/core/macro';
import FolderIcon from '@lucide/svelte/icons/folder';
import { buildCommandRows, type RowsInput } from './command-rows.presenter.ts';

const input = (overrides: Partial<RowsInput> = {}): RowsInput => ({
  links: [],
  commands: [],
  slug: 'acme',
  workspaceId: 'w1',
  project: { id: 'p1', name: 'web-api' },
  can: () => true,
  other: () => undefined,
  projects: [
    { id: 'p1', name: 'web-api' },
    { id: 'p2', name: 'mobile-app' },
  ],
  pipelines: [],
  apps: [],
  members: [],
  workspaceRoles: [],
  instanceRoles: [],
  secrets: [],
  workspaces: [],
  ...overrides,
});

describe('buildCommandRows', () => {
  it('tells two pipelines of two projects by their place', () => {
    const rows = buildCommandRows(
      input({
        can: () => false,
        pipelines: [
          { id: 'l1', name: 'Deploy', projectId: 'p1' },
          { id: 'l2', name: 'Deploy', projectId: 'p2' },
        ],
      }),
    );

    expect(rows.map(row => row.place).slice(-2)).toEqual(['web-api', 'mobile-app']);
  });

  it('tells two pipelines of one project by the start of their id', () => {
    const rows = buildCommandRows(
      input({
        can: () => false,
        pipelines: [
          { id: 'abcd-1111', name: 'Deploy', projectId: 'p1' },
          { id: 'efgh-2222', name: 'Deploy', projectId: 'p1' },
        ],
      }),
    );

    expect(rows.map(row => row.place).slice(-2)).toEqual(['web-api · abcd', 'web-api · efgh']);
    expect(rows.at(-1)?.sentence).toBe('Go to the pipeline Deploy (web-api · efgh).');
  });

  it('keeps only the people, not the apps, in the members', () => {
    const rows = buildCommandRows(
      input({
        members: [
          { actorId: 'u1', actorKind: 'user', displayName: '', handle: 'marie' },
          { actorId: 'a1', actorKind: 'app', displayName: 'Bot', handle: 'bot' },
        ],
      }),
    );

    const people = rows.filter(row => row.group === 'people');
    expect(people.map(row => row.name)).toEqual(['marie']);
    expect(people[0].place).toBeUndefined();
  });

  it('shows the secrets only with an open project', () => {
    const rows = buildCommandRows(
      input({ project: { id: null, name: null }, secrets: [{ name: 'TOKEN' }] }),
    );

    expect(rows.filter(row => row.group === 'secrets')).toEqual([]);
  });

  it('keeps only the workspaces without a slug in the URL', () => {
    const rows = buildCommandRows(
      input({
        slug: undefined,
        workspaces: [{ id: 'w2', name: 'Globex', slug: 'globex' }],
      }),
    );

    expect(rows.map(row => row.group)).toEqual(['workspaces']);
  });

  it('hides a command that is not available, and a page command with no URL', () => {
    const base = { title: msg`Row`, icon: FolderIcon };
    const rows = buildCommandRows(
      input({
        projects: [],
        commands: [
          { ...base, id: 'a', kind: 'go', path: () => null },
          { ...base, id: 'b', kind: 'go', available: () => false, path: () => '/x' },
          { ...base, id: 'c', kind: 'create', form: { path: () => null } },
        ],
      }),
    );

    expect(rows).toEqual([]);
  });

  it('names a project page with the open project, and a workspace page with its group', () => {
    const rows = buildCommandRows(
      input({
        projects: [],
        links: [
          {
            href: '/a',
            url: 'secrets',
            title: msg`Secrets`,
            section: { id: 'project', title: msg`Project` },
          },
          {
            href: '/b',
            url: 'agents',
            title: msg`Agents`,
            group: msg`Machines`,
            section: { id: 'workspace', title: msg`Workspace` },
          },
          {
            href: '/c',
            url: 'overview',
            title: msg`Overview`,
            section: { id: 'workspace', title: msg`Workspace` },
          },
          {
            href: '/d',
            url: 'users',
            title: msg`Users`,
            section: { id: 'instance', title: msg`Instance` },
          },
        ],
      }),
    );

    expect(rows.map(row => row.place)).toEqual(['web-api', 'Machines', undefined, 'Instance']);
  });

  it('finds a word of the other language', () => {
    const [row] = buildCommandRows(
      input({
        projects: [],
        other: message => (message?.id === msg`Agents`.id ? 'Machines de travail' : undefined),
        links: [
          {
            href: '/a',
            url: 'agents',
            title: msg`Agents`,
            section: { id: 'workspace', title: msg`Workspace` },
          },
        ],
      }),
    );

    expect(row.fields.keywords?.[0].normal).toBe('machines de travail');
  });
});
