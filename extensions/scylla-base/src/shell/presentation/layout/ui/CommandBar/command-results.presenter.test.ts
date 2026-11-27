import { describe, expect, it } from 'vitest';
import FolderIcon from '@lucide/svelte/icons/folder';
import { prepareFuzzyText } from '@scylla/ui/utils';
import {
  chipPressed,
  commandChips,
  commandResults,
  firstActionable,
  nameParts,
  parseCommandText,
  resultItems,
  type CommandFilter,
  type CommandResults,
  type ResultOrder,
} from './command-results.presenter.ts';
import type { CommandGroupId, CommandRow } from './command-rows.presenter.ts';

const row = (
  id: string,
  group: CommandGroupId,
  name: string,
  extra: Partial<CommandRow> = {},
): CommandRow => ({
  id,
  group,
  name,
  type: 'Type',
  verb: 'Go to',
  sentence: name,
  icon: FolderIcon,
  effect: { kind: 'go', href: `/${id}` },
  fields: { name: prepareFuzzyText(name) },
  ...extra,
});

const ORDER: ResultOrder = { recent: [] };

const ids = (results: CommandResults) => resultItems(results).map(item => item.id);
const search = (rows: readonly CommandRow[], text: string, order = ORDER) =>
  commandResults(rows, text, null, order);

describe('parseCommandText', () => {
  it.each([
    ['>dark', 'actions', 'dark'],
    ['/ roles', 'pages', 'roles'],
    ['#web', 'work', 'web'],
    ['@marie', 'team', 'marie'],
    ['  >dark', 'actions', 'dark'],
  ])('reads %s', (text, filter, rest) => {
    expect(parseCommandText(text)).toEqual({ filter, search: rest });
  });

  it('keeps a text with no prefix', () => {
    expect(parseCommandText('dark')).toEqual({ search: 'dark' });
    expect(parseCommandText('a>b')).toEqual({ search: 'a>b' });
  });
});

describe('the chips', () => {
  it('shows All and the chips with rows', () => {
    const chips = commandChips([row('a', 'pages', 'A'), row('b', 'actions', 'B')]);

    expect(chips.map(chip => chip.title)).toEqual(['All', 'Pages', 'Actions']);
  });

  it('shows the five families, in order', () => {
    const chips = commandChips([
      row('w', 'workspaces', 'W'),
      row('d', 'dashboards', 'D'),
      row('m', 'machines', 'M'),
      row('l', 'pipelines', 'L'),
      row('g', 'groups', 'G'),
      row('p', 'projects', 'P'),
      row('f', 'fragments', 'F'),
      row('a', 'actions', 'A'),
    ]);

    expect(chips.map(chip => chip.title)).toEqual([
      'All',
      'Pages',
      'Actions',
      'Projects',
      'Library',
      'Team & infra',
    ]);
  });

  it('gives the fragments to the library and the machines to the team', () => {
    const chips = commandChips([row('f', 'fragments', 'F'), row('m', 'machines', 'M')]);

    expect(chips.map(chip => chip.filter)).toEqual([null, 'library', 'team']);
  });

  describe('with a text', () => {
    const rows = [
      row('page:a', 'pages', 'Agents'),
      row('project:p', 'projects', 'web-api'),
      row('job:1', 'jobs', 'deploy'),
      row('user:1', 'users', 'marie'),
    ];
    const typed = (
      search: string,
      active: CommandFilter | null = null,
      searching?: CommandGroupId[],
    ) =>
      commandChips(rows, [], { search, active, order: ORDER, searching }).map(chip => chip.title);

    it('hides a family with no result', () => {
      expect(typed('deploy')).toEqual(['All', 'Projects']);
      expect(typed('marie')).toEqual(['All', 'Team & infra']);
    });

    it('keeps the family in use, with no result', () => {
      expect(typed('deploy', 'team')).toEqual(['All', 'Projects', 'Team & infra']);
    });

    it('keeps a family that waits for the server', () => {
      expect(typed('zzz', null, ['users'])).toEqual(['All', 'Team & infra']);
    });

    it('shows all the families with no text', () => {
      expect(typed('')).toEqual(['All', 'Pages', 'Projects', 'Team & infra']);
    });
  });

  it('does not count a row that needs a word to show', () => {
    const chips = commandChips([row('a', 'actions', 'A', { gate: 'run' })]);

    expect(chips.map(chip => chip.title)).toEqual(['All']);
  });

  it('presses the chip of the projects for the prefix of the work', () => {
    expect(chipPressed('projects', 'work')).toBe(true);
    expect(chipPressed('library', 'work')).toBe(false);
    expect(chipPressed('pages', 'work')).toBe(false);
    expect(chipPressed(null, null)).toBe(true);
  });
});

describe('the groups', () => {
  it('keeps the fixed order of the groups', () => {
    const results = search(
      [
        row('w', 'workspaces', 'deploy workspace'),
        row('s', 'projects', 'deploy project'),
        row('p', 'pages', 'deploy page'),
      ],
      'deploy',
    );

    expect(results.sections.map(section => section.id)).toEqual([
      'pages',
      'projects',
      'workspaces',
    ]);
  });

  it('ranks the groups, the fragments and the dashboards with the others', () => {
    const results = search(
      [
        row('d', 'dashboards', 'deploy dashboard'),
        row('f', 'fragments', 'deploy fragment'),
        row('l', 'pipelines', 'deploy pipeline'),
        row('g', 'groups', 'deploy group'),
        row('s', 'projects', 'deploy project'),
      ],
      'deploy',
    );

    expect(results.sections.map(section => [section.id, section.heading])).toEqual([
      ['groups', 'Groups'],
      ['projects', 'Projects'],
      ['pipelines', 'Pipelines'],
      ['fragments', 'Fragments'],
      ['dashboards', 'Dashboards'],
    ]);
  });

  it('shows a group before the projects that name it in their place', () => {
    const inGroup = (name: string) => ({
      fields: { name: prepareFuzzyText(name), place: prepareFuzzyText('Backend services') },
    });
    const results = search(
      [
        row('p1', 'projects', 'web-api', inGroup('web-api')),
        row('p2', 'projects', 'worker', inGroup('worker')),
        row('g', 'groups', 'Backend services'),
      ],
      'bakend services',
    );

    expect(ids(results).slice(0, 1)).toEqual(['g']);
  });

  describe('a row of one chip only', () => {
    const rows = [
      row('page:dashboard', 'pages', 'Dashboard'),
      row('page:dashboard', 'dashboards', 'Dashboard', { chipOnly: true }),
    ];

    it('shows under its chip, and gives the chip', () => {
      expect(
        commandResults(rows, '', 'pages', ORDER).sections.map(section => section.id),
      ).toEqual(['pages', 'dashboards']);
      expect(
        commandResults(rows, 'dash', 'pages', ORDER).sections.map(section => section.id),
      ).toEqual(['pages', 'dashboards']);
      expect(commandChips(rows).map(chip => chip.title)).toEqual(['All', 'Pages']);
    });

    it('does not show twice with all the rows', () => {
      expect(search(rows, 'dash').sections.map(section => section.id)).toEqual(['pages']);
    });

    it('shows a recent pick as the row of the other group', () => {
      const [first] = resultItems(search(rows, '', { recent: ['page:dashboard'] }));

      expect(first.kind === 'row' && first.row.group).toBe('pages');
    });
  });

  it('lists the fragments under the library and the pipelines under the projects', () => {
    const rows = [
      row('f', 'fragments', 'lint'),
      row('l', 'pipelines', 'build'),
      row('g', 'groups', 'core'),
    ];

    expect(ids(commandResults(rows, '', 'library', ORDER))).toEqual(['f']);
    expect(ids(commandResults(rows, '', 'projects', ORDER))).toEqual(['g', 'l']);
  });

  it('keeps 4 rows, then a row with the number of the others', () => {
    const rows = Array.from({ length: 6 }, (_, index) =>
      row(`p${index}`, 'projects', `service ${index}`),
    );
    const [section] = search(rows, 'service').sections;

    expect(section.items).toHaveLength(5);
    expect(section.items[4]).toMatchObject({ kind: 'more', count: 2, filter: 'projects' });
  });

  it('keeps all the rows with a filter', () => {
    const rows = Array.from({ length: 150 }, (_, index) =>
      row(`p${index}`, 'projects', `service ${index}`),
    );
    const results = commandResults(rows, 'service', 'projects', ORDER);

    expect(resultItems(results)).toHaveLength(150);
  });

  it('counts the rows above the limit of a filter', () => {
    const rows = Array.from({ length: 210 }, (_, index) =>
      row(`p${index}`, 'projects', `service ${index}`),
    );
    const [section] = commandResults(rows, 'service', 'projects', ORDER).sections;

    expect(section.items).toHaveLength(200);
    expect(section.hidden).toBe(10);
  });

  it('shows a filter with no text, the active choice last', () => {
    const rows = [
      row('dark', 'preferences', 'Dark', { verb: undefined }),
      row('light', 'preferences', 'Light'),
      row('page', 'pages', 'Page'),
    ];

    expect(ids(commandResults(rows, '', 'pages', ORDER))).toEqual(['page', 'light', 'dark']);
  });
});

describe('the best match', () => {
  it('shows a row of a later group that is in a better tier', () => {
    const results = search(
      [row('page', 'pages', 'deploy tools'), row('project', 'projects', 'deply')],
      'deply',
    );

    expect(results.sections[0]).toMatchObject({ id: 'best', heading: 'Best match' });
    expect(ids(results)[0]).toBe('project');
  });

  it('does not show the row twice', () => {
    const results = search(
      [row('page', 'pages', 'deploy tools'), row('project', 'projects', 'deply')],
      'deply',
    );

    expect(ids(results).filter(id => id === 'project')).toHaveLength(1);
  });

  it('does not show it when the row is already first', () => {
    const results = search(
      [row('page', 'pages', 'deply'), row('project', 'projects', 'deploy tools')],
      'deply',
    );

    expect(results.sections[0].id).toBe('pages');
  });

  it('does not show it when two rows are in one tier', () => {
    const results = search(
      [row('page', 'pages', 'build tools'), row('project', 'projects', 'build web')],
      'build',
    );

    expect(results.sections[0].id).toBe('pages');
  });

  it('never gives it to the active choice', () => {
    const results = search(
      [row('page', 'pages', 'deploy tools'), row('w', 'workspaces', 'deply', { verb: undefined })],
      'deply',
    );

    expect(results.sections[0].id).toBe('pages');
  });
});

describe('the order in a group', () => {
  const twins = [
    row('a', 'pipelines', 'Deploy web', { projectId: 'p1' }),
    row('b', 'pipelines', 'Deploy api', { projectId: 'p2' }),
  ];

  it('puts the open project first', () => {
    expect(ids(search(twins, 'deploy', { recent: [], openProject: 'p2' }))).toEqual(['b', 'a']);
  });

  it('puts a recent pick first', () => {
    expect(ids(search(twins, 'deploy', { recent: ['b'] }))).toEqual(['b', 'a']);
  });

  it('puts the shorter name first', () => {
    const rows = [row('long', 'pages', 'Deploy everything'), row('short', 'pages', 'Deploy')];

    expect(ids(search(rows, 'depl'))).toEqual(['short', 'long']);
  });

  it('puts the active choice last, even with the best score', () => {
    const rows = [
      row('dark', 'preferences', 'Dark', { verb: undefined }),
      row('other', 'preferences', 'Dark blue'),
    ];

    expect(ids(search(rows, 'dark'))).toEqual(['other', 'dark']);
  });
});

describe('the rows that need a word', () => {
  const rows = [
    row('go', 'pipelines', 'Build web'),
    row('run', 'actions', 'Run Build web', {
      gate: 'run',
      fields: {
        name: prepareFuzzyText('Run Build web'),
        keywords: [prepareFuzzyText('run start')],
      },
    }),
  ];

  it('hides the run without a word that means to run', () => {
    expect(ids(search(rows, 'build web'))).toEqual(['go']);
  });

  it('shows it with this word, also with a typing error', () => {
    expect(ids(search(rows, 'run build'))).toContain('run');
    expect(ids(search(rows, 'rnu build'))).toContain('run');
  });

  it('needs a name after the word', () => {
    expect(ids(search(rows, 'run'))).not.toContain('run');
  });

  it('shows it on the page of the pipeline', () => {
    const here = rows.map(item => (item.gate ? { ...item, here: true } : item));

    expect(ids(search(here, 'run'))).toContain('run');
  });
});

describe('the close results', () => {
  it('says that all the rows needed an error', () => {
    expect(search([row('a', 'pages', 'Deploy')], 'delpoy').closeOnly).toBe(true);
    expect(search([row('a', 'pages', 'Deploy')], 'deploy').closeOnly).toBe(false);
  });

  it('does not say it when a row is exact', () => {
    const rows = [row('a', 'pages', 'Deploy'), row('b', 'pages', 'Delpoy')];

    expect(search(rows, 'delpoy').closeOnly).toBe(false);
  });

  it('does not say it with no row', () => {
    expect(search([], 'deploy').closeOnly).toBe(false);
  });
});

describe('the start', () => {
  const rows = [
    row('page', 'pages', 'Page'),
    row('here', 'actions', 'Here', { here: true }),
    row('dark', 'preferences', 'Dark', { verb: undefined }),
    row('light', 'preferences', 'Light'),
  ];

  it('gives the recent rows, what acts here, then the preferences', () => {
    const results = commandResults(rows, '', null, { recent: ['page'], here: 'project' });

    expect(results.sections.map(section => section.heading)).toEqual([
      'Recent',
      'In this project',
      'Preferences',
    ]);
  });

  it("shows the What's new row with no text, in a Help group", () => {
    const results = commandResults(
      [...rows, row('command:shell.whats-new', 'actions', "What's new")],
      '',
      null,
      { recent: [] },
    );

    expect(results.sections.map(section => section.heading)).toEqual([
      'In this project',
      'Pages',
      'Preferences',
      'Help',
    ]);
    expect(ids(results)).toContain('command:shell.whats-new');
  });

  it('never preselects a preference with no text', () => {
    const results = commandResults(rows, '', null, { recent: ['light'] });

    expect(firstActionable(results)).not.toMatch(/^(light|dark)$/);
    expect(firstActionable(results)).toBe('here');
    expect(
      firstActionable(commandResults([rows[0], ...rows.slice(2)], '', null, { recent: [] })),
    ).toBe('page');
  });

  it('names a pipeline page', () => {
    const results = commandResults(rows, '', null, { recent: [], here: 'pipeline' });

    expect(results.sections[0].heading).toBe('On this pipeline');
  });

  it('shows a row once', () => {
    const results = commandResults(rows, '', null, { recent: ['here', 'light'] });

    expect(ids(results)).toEqual(['here', 'page', 'light', 'dark']);
  });

  it('keeps 5 recent rows, and skips a row that left', () => {
    const many = Array.from({ length: 7 }, (_, index) =>
      row(`r${index}`, 'pages', `Page ${index}`),
    );
    const recent = ['gone', ...many.map(item => item.id)];

    const [section] = commandResults(many, '', null, { recent }).sections;

    expect(section.items.map(item => item.id)).toEqual(['r0', 'r1', 'r2', 'r3', 'r4']);
  });

  it('does not offer the active choice as a recent row', () => {
    const results = commandResults(rows, '', null, { recent: ['dark'] });

    expect(results.sections[0].id).not.toBe('recent');
  });
});

describe('firstActionable', () => {
  it('skips the active choice', () => {
    const results = search(
      [
        row('dark', 'preferences', 'Dark', { verb: undefined }),
        row('next', 'actions', 'Dark blue'),
      ],
      'dark',
    );

    expect(firstActionable(results)).toBe('next');
  });

  it('gives nothing with no row', () => {
    expect(firstActionable(search([], 'x'))).toBe('');
  });
});

describe('nameParts', () => {
  it('splits a name on the letters that matched', () => {
    expect(
      nameParts('Build web', [
        [0, 3],
        [6, 9],
      ]),
    ).toEqual([
      { text: 'Bui', hit: true },
      { text: 'ld ', hit: false },
      { text: 'web', hit: true },
    ]);
  });

  it('keeps a name with no match', () => {
    expect(nameParts('Build', [])).toEqual([{ text: 'Build', hit: false }]);
  });
});

describe('the server search', () => {
  const job = row('job:1', 'jobs', '#9f3c2a1b', { found: true });
  const rerun = row('rerun:1', 'jobs', 'Rerun #9f3c2a1b', { found: true, follows: 'job:1' });
  const other = row('job:2', 'jobs', '#11112222', { found: true });

  it('keeps a row that the server found, also when the letters do not match it', () => {
    expect(ids(search([job, row('page:a', 'pages', 'Agents')], 'deploy'))).toEqual(['job:1']);
  });

  it('puts an action just after the row that it acts on', () => {
    expect(ids(search([rerun, other, job], 'rerun'))).toEqual(['job:2', 'job:1', 'rerun:1']);
    expect(ids(search([other, job, rerun], '9f3c'))).toEqual(['job:1', 'rerun:1', 'job:2']);
  });

  it('never gives the best match to an action', () => {
    const results = search([rerun, row('page:a', 'pages', 'Agents')], 'rerun');

    expect(results.sections.map(section => section.id)).toEqual(['jobs']);
  });

  it('shows the section of a kind that the server searches, before its first rows come', () => {
    const order: ResultOrder = { recent: [], searching: ['jobs', 'users'] };

    const all = commandResults([job], 'deploy', null, order);
    const tab = commandResults([], 'deploy', 'projects', order);

    expect(all.sections.map(({ id, searching }) => ({ id, searching }))).toEqual([
      { id: 'jobs', searching: true },
      { id: 'users', searching: true },
    ]);
    expect(tab.sections).toEqual([{ id: 'jobs', heading: 'Jobs', items: [], searching: true }]);
    expect(tab.total).toBe(0);
  });

  it('gives # the jobs too', () => {
    const rows = [job, row('project:p1', 'projects', 'web-api'), row('page:a', 'pages', 'Agents')];

    expect(ids(commandResults(rows, '', 'work', ORDER))).toEqual(['project:p1', 'job:1']);
  });

  it('shows the chip of a kind that the reader can search, before its rows', () => {
    const titles = commandChips([row('page:a', 'pages', 'Agents')], ['jobs', 'users']).map(
      ({ title }) => title,
    );

    expect(titles).toEqual(['All', 'Pages', 'Projects', 'Team & infra']);
  });

  it('gives a stored row of the server search in the recent rows', () => {
    const results = commandResults([row('page:a', 'pages', 'Agents')], '', null, {
      recent: ['job:1', 'page:a'],
      recentRows: [job],
    });

    expect(results.sections[0].items.map(item => item.id)).toEqual(['job:1', 'page:a']);
  });
});
