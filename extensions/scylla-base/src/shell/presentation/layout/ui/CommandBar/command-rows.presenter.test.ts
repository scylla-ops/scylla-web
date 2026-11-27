import { describe, expect, it } from 'vitest';
import { msg } from '@lingui/core/macro';
import FolderIcon from '@lucide/svelte/icons/folder';
import GitForkIcon from '@lucide/svelte/icons/git-fork';
import LockIcon from '@lucide/svelte/icons/lock';
import UsersIcon from '@lucide/svelte/icons/users';
import { Permission } from '@platform/authz';
import { commandResults } from './command-results.presenter.ts';
import {
  buildCommandRows,
  type CommandRow,
  type CommandWorkspace,
  type RowsInput,
} from './command-rows.presenter.ts';

const input = (overrides: Partial<RowsInput> = {}): RowsInput => ({
  links: [],
  commands: [],
  slug: 'acme',
  workspaceId: 'w1',
  project: { id: 'p1', name: 'web-api' },
  // Each right but the instance view of the workspaces: the tests of an admin give it.
  can: permission => permission !== Permission.LIST_ALL_WORKSPACES,
  other: () => undefined,
  projects: [
    { id: 'p1', name: 'web-api' },
    { id: 'p2', name: 'mobile-app' },
  ],
  groups: [],
  pipelines: [],
  fragments: [],
  dashboards: [],
  apps: [],
  members: [],
  workspaceRoles: [],
  instanceRoles: [],
  secrets: [],
  workspaces: [],
  otherWorkspaces: [],
  ...overrides,
});

const ofGroup = (rows: readonly CommandRow[], group: CommandRow['group']) =>
  rows.filter(row => row.group === group);

describe('buildCommandRows', () => {
  it('gives a new project in each group to a person who can create a project', () => {
    const groups = [
      { id: 'g-1', name: 'Deploys' },
      { id: 'g-2', name: 'Backend' },
    ];
    const rows = buildCommandRows(input({ groups })).filter(row =>
      row.id.startsWith('new-project-in:'),
    );

    expect(rows.map(({ name, group, verb, effect }) => ({ name, group, verb, effect }))).toEqual([
      {
        name: 'New project in Deploys',
        group: 'actions',
        verb: 'Create…',
        effect: { kind: 'go', href: '/acme/projects/new?group=g-1' },
      },
      {
        name: 'New project in Backend',
        group: 'actions',
        verb: 'Create…',
        effect: { kind: 'go', href: '/acme/projects/new?group=g-2' },
      },
    ]);
    expect(rows[0]?.sentence).toBe(
      'Open the form: New project in Deploys. Nothing changes until you submit it.',
    );
    expect(
      buildCommandRows(input({ groups, can: () => false })).some(row =>
        row.id.startsWith('new-project-in:'),
      ),
    ).toBe(false);
  });

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

  it('shows a person, an agent, an app and a project as everywhere else: its photo or its icon', () => {
    const rows = buildCommandRows(
      input({
        projects: [{ id: 'p1', name: 'web-api', icon: { kind: 'glyph', name: 'rocket', color: '#3366cc' } }],
        apps: [
          { id: 'a1', name: 'prod-runner', runner: true, icon: { kind: 'glyph', name: 'cpu', color: 'chart-2' } },
          { id: 'a2', name: 'release-bot', runner: false },
        ],
        members: [
          { actorId: 'u1', actorKind: 'user', displayName: 'Marie', handle: 'marie', avatarColor: '#aa3322' },
          { actorId: 'u2', actorKind: 'user', displayName: 'Paul', handle: 'paul', avatarUrl: '/p.png' },
        ],
        selfId: 'u1',
      }),
    );
    const look = (id: string) => rows.find(row => row.id === id)?.look;

    expect(look('project:p1')).toMatchObject({ kind: 'project', icon: { color: '#3366cc' } });
    expect(look('app:a1')).toMatchObject({
      kind: 'agent',
      profile: { displayName: 'prod-runner', avatarGlyph: 'cpu', avatarColor: 'chart-2' },
    });
    expect(look('app:a2')).toMatchObject({ kind: 'app', profile: { displayName: 'release-bot' } });
    expect(look('member:u1')).toEqual({
      kind: 'person',
      profile: { displayName: 'Marie', username: 'marie', avatarColor: '#aa3322', avatarUrl: undefined },
      self: true,
    });
    expect(look('member:u2')).toMatchObject({ profile: { avatarUrl: '/p.png' }, self: false });
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

  describe('the groups of the projects', () => {
    const grouped = input({
      projects: [
        { id: 'p1', name: 'web-api', groupId: 'g1' },
        { id: 'p2', name: 'mobile-app', groupId: 'g1' },
        { id: 'p3', name: 'docs', groupId: 'g2' },
        { id: 'p4', name: 'sandbox' },
      ],
      groups: [
        { id: 'g1', name: 'Backend', color: 'chart-2' },
        { id: 'g2', name: 'Content' },
      ],
    });

    it('gives each group its folder color and the number of its projects', () => {
      const groups = ofGroup(buildCommandRows(grouped), 'groups');

      expect(groups.map(row => [row.name, row.type, row.facts, row.iconColor])).toEqual([
        ['Backend', 'Group', '2 projects', 'chart-2'],
        ['Content', 'Group', '1 project', undefined],
      ]);
      expect(groups[0].icon).toBe(FolderIcon);
      expect(groups[0].sentence).toBe('Go to the group Backend on the projects page.');
    });

    it('opens the projects page on the group', () => {
      const [backend] = ofGroup(buildCommandRows(grouped), 'groups');

      expect(backend.effect).toEqual({ kind: 'go', href: '/acme/projects?group=g1' });
    });

    it('does not search the number of projects', () => {
      const [backend] = ofGroup(buildCommandRows(grouped), 'groups');

      expect(backend.fields.place?.normal).toBe('group');
    });

    it('names the group of a project, with the folder color of the group', () => {
      const projects = ofGroup(buildCommandRows(grouped), 'projects');

      expect(projects.map(row => [row.name, row.place, row.placeGlyph?.color])).toEqual([
        ['web-api', 'Backend', 'chart-2'],
        ['mobile-app', 'Backend', 'chart-2'],
        ['docs', 'Content', undefined],
        ['sandbox', undefined, undefined],
      ]);
      expect(projects[0].placeGlyph?.icon).toBe(FolderIcon);
      expect(projects[0].sentence).toBe('Go to the project web-api (Backend).');
      expect(projects[3].placeGlyph).toBeUndefined();
    });

    it('shows the icon that a project chose', () => {
      const [project] = buildCommandRows(
        input({
          projects: [
            { id: 'p1', name: 'web-api', icon: { kind: 'glyph', name: 'rocket', color: 'chart-4' } },
          ],
        }),
      );

      expect(project.look).toMatchObject({ kind: 'project', icon: { color: 'chart-4' } });
      expect(project.iconKey).toBe('{"kind":"glyph","name":"rocket","color":"chart-4"}');
    });

    it('hides the groups without the right to read the workspace', () => {
      const rows = buildCommandRows({
        ...grouped,
        can: permission => permission !== Permission.READ_WORKSPACE,
      });

      expect(ofGroup(rows, 'groups')).toEqual([]);
    });
  });

  describe('the dashboards', () => {
    const dashboards = input({
      selfId: 'u1',
      members: [
        { actorId: 'u1', actorKind: 'user', displayName: 'Sébastien Lucas', handle: 'seb' },
        { actorId: 'u2', actorKind: 'user', displayName: 'Marie Dubois', handle: 'marie' },
      ],
      dashboards: [
        {
          id: 'd1',
          name: 'Ops overview',
          visibility: 'private',
          teamDefault: false,
          createdBy: 'u1',
          path: 'dashboard',
        },
        {
          id: 'd2',
          name: 'Releases',
          visibility: 'workspace',
          teamDefault: true,
          createdBy: 'u2',
          path: 'dashboards/d2',
        },
        {
          id: 'd3',
          name: 'Costs',
          visibility: 'workspace',
          teamDefault: false,
          createdBy: 'u1',
          path: 'dashboards/d3',
        },
      ],
    });

    it('says personal or shared, and names the creator of a shared dashboard', () => {
      const rows = ofGroup(buildCommandRows(dashboards), 'dashboards');

      expect(rows.map(row => [row.name, row.type, row.place, row.facts])).toEqual([
        ['Ops overview', 'Dashboard', 'Personal', undefined],
        ['Releases', 'Dashboard', 'Shared', 'Marie Dubois · Team default'],
        ['Costs', 'Dashboard', 'Shared', 'You'],
      ]);
      expect(rows.map(row => row.placeGlyph?.icon)).toEqual([LockIcon, UsersIcon, UsersIcon]);
    });

    it('goes to the path of the dashboard: the default one is at « dashboard »', () => {
      const rows = ofGroup(buildCommandRows(dashboards), 'dashboards');

      expect(rows.map(row => row.effect)).toEqual([
        { kind: 'go', href: '/acme/dashboard' },
        { kind: 'go', href: '/acme/dashboards/d2' },
        { kind: 'go', href: '/acme/dashboards/d3' },
      ]);
      expect(rows[1].sentence).toBe('Go to the dashboard Releases (Shared).');
    });

    it('finds a shared dashboard by the name of its creator', () => {
      const [, releases] = ofGroup(buildCommandRows(dashboards), 'dashboards');

      expect(releases.fields.place?.normal).toContain('marie dubois');
    });

    const DASHBOARD_PAGE = {
      href: '/acme/dashboard',
      url: 'dashboard',
      title: msg`Dashboard`,
      section: { id: 'workspace', title: msg`Workspace` },
    };

    it('shows the page of the dashboard under its chip only, for a workspace with no dashboard', () => {
      const rows = buildCommandRows(input({ links: [DASHBOARD_PAGE], dashboards: [] }));

      expect(ofGroup(rows, 'dashboards')).toEqual([
        expect.objectContaining({
          id: 'page:workspace/dashboard',
          name: 'Dashboard',
          type: 'Page',
          chipOnly: true,
          effect: { kind: 'go', href: '/acme/dashboard' },
          sentence: 'Go to the page Dashboard.',
        }),
      ]);
      expect(ofGroup(rows, 'pages').map(row => [row.id, row.chipOnly])).toEqual([
        ['page:workspace/dashboard', undefined],
      ]);
    });

    it('shows no row of the dashboards while the bar cannot read them', () => {
      const rows = buildCommandRows(input({ links: [DASHBOARD_PAGE], dashboards: undefined }));

      expect(ofGroup(rows, 'dashboards')).toEqual([]);
    });

    it('shows no page in the dashboards when the workspace has some', () => {
      const rows = buildCommandRows({ ...dashboards, links: [DASHBOARD_PAGE] });

      expect(ofGroup(rows, 'dashboards').map(row => row.id)).toEqual([
        'dashboard:d1',
        'dashboard:d2',
        'dashboard:d3',
      ]);
    });
  });

  it('goes to a fragment of the library, with the icon of its source', () => {
    const rows = ofGroup(
      buildCommandRows(
        input({
          fragments: [
            { id: 'f1', name: 'docker-build', tags: ['docker'] },
            { id: 'f2', name: 'helm-deploy', source: { kind: 'forked' } },
          ],
        }),
      ),
      'fragments',
    );

    expect(rows.map(row => [row.name, row.place, row.effect])).toEqual([
      ['docker-build', undefined, { kind: 'go', href: '/acme/library/f1' }],
      ['helm-deploy', 'Forked', { kind: 'go', href: '/acme/library/f2' }],
    ]);
    expect(rows[1].icon).toBe(GitForkIcon);
    expect(rows[0].fields.keywords?.[0].normal).toBe('docker');
  });

  describe('the workspaces', () => {
    const personal = (
      id: string,
      owner: string,
      role: string,
      counts = { memberCount: 1, projectCount: 2 },
    ): CommandWorkspace => ({
      id,
      name: 'Personal',
      slug: `personal-${id}`,
      owner: { id: `u-${id}`, username: owner.split(' ')[0].toLowerCase(), displayName: owner },
      role,
      ...counts,
    });
    const own: CommandWorkspace = {
      ...personal('01a1b2c3', 'Sébastien LUCAS', 'owner'),
      icon: { kind: 'glyph', name: 'rocket', color: 'chart-2' },
    };
    const shared = personal('01d4e5f6', 'Marie Dubois', 'member', { memberCount: 3, projectCount: 0 });
    const alice = personal('01f7a8b9', 'Alice Martin', '');
    const workspaceRows = (overrides: Partial<RowsInput>) =>
      buildCommandRows(input({ slug: undefined, ...overrides })).filter(
        row => row.group === 'workspaces',
      );

    it('show the owner, the role and the counts, with no part of the id', () => {
      const [mine, other] = workspaceRows({ workspaces: [own, shared] });

      expect(mine).toMatchObject({
        name: 'Personal',
        place: 'Sébastien LUCAS',
        facts: 'Owner · Members: 1 · Projects: 2',
        owner: own.owner,
        sentence: 'Switch to Personal of Sébastien LUCAS',
      });
      expect(other).toMatchObject({ place: 'Marie Dubois', facts: 'Member · Members: 3 · Projects: 0' });
      // The icon that the workspace chose, else a building in grey.
      expect(mine.look).toMatchObject({ kind: 'workspace', icon: { color: 'chart-2' } });
      expect(other.look).toMatchObject({ kind: 'workspace', icon: { color: 'muted-foreground' } });
      expect(mine.iconKey).toBe('{"kind":"glyph","name":"rocket","color":"chart-2"}');
      expect(JSON.stringify([mine.place, mine.sentence, other.place])).not.toMatch(/01/);
    });

    it('say "Current" on the active workspace', () => {
      const [mine] = workspaceRows({ workspaces: [own], workspaceId: own.id });

      expect(mine.verb).toBeUndefined();
      expect(mine.sentence).toBe('Personal (Sébastien LUCAS) is the current choice.');
    });

    it('give a user without the instance view only its own workspaces', () => {
      const rows = workspaceRows({ workspaces: [own], otherWorkspaces: [alice] });

      expect(rows.map(row => row.id)).toEqual([`workspace:${own.id}`]);
    });

    it('give an admin its own workspaces, then the others with "Instance admin", then the list of all', () => {
      const rows = workspaceRows({
        can: () => true,
        search: 'martin',
        workspaces: [own],
        otherWorkspaces: [alice, own],
      });

      expect(rows.map(row => [row.id, row.rank])).toEqual([
        [`workspace:${own.id}`, 0],
        [`workspace:${alice.id}`, 1],
        ['workspaces:all', 2],
      ]);
      expect(rows[1].facts).toBe('Instance admin · Members: 1 · Projects: 2');
      expect(rows[2]).toMatchObject({
        name: 'All workspaces…',
        effect: { kind: 'go', href: '/admin/workspaces?q=martin' },
      });
    });

    it('find a workspace by its owner, own first, and keep the list of all after them', () => {
      const rows = buildCommandRows(
        input({ can: () => true, workspaces: [own], otherWorkspaces: [alice] }),
      );
      const ids = (search: string) =>
        commandResults(rows, search, 'pages', { recent: [] }).sections.flatMap(section =>
          section.items.map(item => item.id),
        );

      expect(ids('personal')).toEqual([`workspace:${own.id}`, `workspace:${alice.id}`, 'workspaces:all']);
      expect(ids('alice')).toEqual([`workspace:${alice.id}`, 'workspaces:all']);
      expect(ids('zzzz')).toEqual([]);
    });
  });
});
