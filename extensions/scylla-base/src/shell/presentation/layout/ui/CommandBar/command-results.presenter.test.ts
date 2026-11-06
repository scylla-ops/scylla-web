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
    ['@marie', 'people', 'marie'],
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
    const chips = commandChips([row('a', 'pages', 'A'), row('b', 'preferences', 'B')]);

    expect(chips.map(chip => chip.title)).toEqual(['All', 'Pages', 'Actions']);
  });

  it('does not count a row that needs a word to show', () => {
    const chips = commandChips([row('a', 'actions', 'A', { gate: 'run' })]);

    expect(chips.map(chip => chip.title)).toEqual(['All']);
  });

  it('presses the two chips of the prefix of the work', () => {
    expect(chipPressed('projects', 'work')).toBe(true);
    expect(chipPressed('pipelines', 'work')).toBe(true);
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

    expect(ids(commandResults(rows, '', 'actions', ORDER))).toEqual(['light', 'dark']);
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
    row('run', 'actions', 'Run Build web', { gate: 'run', fields: {
      name: prepareFuzzyText('Run Build web'),
      keywords: [prepareFuzzyText('run start')],
    } }),
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

  it('names a pipeline page', () => {
    const results = commandResults(rows, '', null, { recent: [], here: 'pipeline' });

    expect(results.sections[0].heading).toBe('On this pipeline');
  });

  it('shows a row once', () => {
    const results = commandResults(rows, '', null, { recent: ['here', 'light'] });

    expect(ids(results)).toEqual(['here', 'light', 'dark']);
  });

  it('keeps 5 recent rows, and skips a row that left', () => {
    const many = Array.from({ length: 7 }, (_, index) => row(`r${index}`, 'pages', `Page ${index}`));
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
      [row('dark', 'preferences', 'Dark', { verb: undefined }), row('next', 'actions', 'Dark blue')],
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
    expect(nameParts('Build web', [[0, 3], [6, 9]])).toEqual([
      { text: 'Bui', hit: true },
      { text: 'ld ', hit: false },
      { text: 'web', hit: true },
    ]);
  });

  it('keeps a name with no match', () => {
    expect(nameParts('Build', [])).toEqual([{ text: 'Build', hit: false }]);
  });
});
