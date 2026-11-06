import type { MessageDescriptor } from '@lingui/core';
import { t } from '@scylla/ui/i18n';
import {
  fuzzyMatch,
  prepareFuzzyQuery,
  prepareFuzzyText,
  type FuzzyMatch,
  type FuzzyQuery,
  type FuzzyRange,
} from '@scylla/ui/utils';
import { commandBarMessages as messages } from '@base/shell/presentation/layout/messages/command-bar.messages.ts';
import type { CommandGroupId, CommandRow } from './command-rows.presenter.ts';

export type CommandFilter =
  | 'pages'
  | 'actions'
  | 'projects'
  | 'pipelines'
  | 'machines'
  | 'people'
  | 'secrets'
  | 'workspaces'
  /** `#`: the projects and the pipelines together. No chip has this name. */
  | 'work';

const FILTER_GROUPS: Record<CommandFilter, readonly CommandGroupId[]> = {
  pages: ['pages'],
  actions: ['preferences', 'actions'],
  projects: ['projects'],
  pipelines: ['pipelines'],
  machines: ['machines'],
  people: ['people', 'roles'],
  secrets: ['secrets'],
  workspaces: ['workspaces'],
  work: ['projects', 'pipelines'],
};

const GROUP_FILTER: Record<CommandGroupId, CommandFilter> = {
  pages: 'pages',
  preferences: 'actions',
  actions: 'actions',
  projects: 'projects',
  pipelines: 'pipelines',
  machines: 'machines',
  people: 'people',
  roles: 'people',
  secrets: 'secrets',
  workspaces: 'workspaces',
};

const GROUP_ORDER: readonly CommandGroupId[] = [
  'pages',
  'preferences',
  'actions',
  'projects',
  'pipelines',
  'machines',
  'people',
  'roles',
  'secrets',
  'workspaces',
];

const GROUP_TITLES: Record<CommandGroupId, MessageDescriptor> = {
  pages: messages.groupPages,
  preferences: messages.groupPreferences,
  actions: messages.groupActions,
  projects: messages.groupProjects,
  pipelines: messages.groupPipelines,
  machines: messages.groupMachines,
  people: messages.groupPeople,
  roles: messages.groupRoles,
  secrets: messages.groupSecrets,
  workspaces: messages.groupWorkspaces,
};

const PREFIXES: Readonly<Record<string, CommandFilter>> = {
  '>': 'actions',
  '/': 'pages',
  '#': 'work',
  '@': 'people',
};

const RUN_WORDS = prepareFuzzyText('run start launch execute lancer executer demarrer');
const MIN_RUN_SCORE = 500;

const GROUP_LIMIT = 4;
const FILTER_LIMIT = 200;
const RECENT_LIMIT = 5;
const HERE_LIMIT = 6;

export const groupTitle = (group: CommandGroupId): string => t(GROUP_TITLES[group]);

/** A prefix is a filter with a shorter way to type it. */
export const parseCommandText = (text: string): { filter?: CommandFilter; search: string } => {
  const start = text.trimStart();
  const filter = PREFIXES[start[0]];
  return filter ? { filter, search: start.slice(1).trimStart() } : { search: text };
};

export interface CommandChip {
  /** `null`: all the rows. */
  filter: CommandFilter | null;
  title: string;
}

/** A chip shows only when it has rows. */
export const commandChips = (rows: readonly CommandRow[]): CommandChip[] => {
  const present = new Set(rows.filter(row => !row.gate).map(row => row.group));
  const chip = (filter: CommandFilter, title: MessageDescriptor): CommandChip[] =>
    FILTER_GROUPS[filter].some(group => present.has(group)) ? [{ filter, title: t(title) }] : [];
  return [
    { filter: null, title: t(messages.chipAll) },
    ...chip('pages', messages.groupPages),
    ...chip('actions', messages.groupActions),
    ...chip('projects', messages.groupProjects),
    ...chip('pipelines', messages.groupPipelines),
    ...chip('machines', messages.groupMachines),
    ...chip('people', messages.groupPeople),
    ...chip('secrets', messages.groupSecrets),
    ...chip('workspaces', messages.groupWorkspaces),
  ];
};

export const chipPressed = (chip: CommandFilter | null, active: CommandFilter | null): boolean =>
  active === 'work' ? chip === 'projects' || chip === 'pipelines' : chip === active;

export interface ResultRow {
  id: string;
  kind: 'row';
  row: CommandRow;
  ranges: readonly FuzzyRange[];
}

export interface ResultMore {
  id: string;
  kind: 'more';
  /** The rows that do not show. */
  count: number;
  filter: CommandFilter;
  sentence: string;
}

export type ResultItem = ResultRow | ResultMore;

export interface ResultSection {
  id: string;
  heading?: string;
  items: readonly ResultItem[];
  /** The rows above the limit of a filter. */
  hidden?: number;
}

export interface CommandResults {
  sections: readonly ResultSection[];
  total: number;
  /** All the rows needed an error in the text. */
  closeOnly: boolean;
}

export interface ResultOrder {
  openProject?: string | null;
  /** The ids of the last picks, the last one first. */
  recent: readonly string[];
  /** What the rows of `here` act on. */
  here?: 'project' | 'pipeline';
}

interface Scored {
  row: CommandRow;
  match: FuzzyMatch;
}

const SCORE_BUCKET = 20;
const TIER = 100;

const recentRank = (order: ResultOrder, id: string): number => {
  const index = order.recent.indexOf(id);
  return index === -1 ? order.recent.length : index;
};

/**
 * The active choice is last, because Enter does nothing on it. Scores that are near count as
 * equal: then the open project, the recent picks and the shorter name decide.
 */
const compareScored =
  (order: ResultOrder) =>
  (a: Scored, b: Scored): number =>
    Number(a.row.verb === undefined) - Number(b.row.verb === undefined) ||
    Math.round(b.match.score / SCORE_BUCKET) - Math.round(a.match.score / SCORE_BUCKET) ||
    Number(!!b.row.projectId && b.row.projectId === order.openProject) -
      Number(!!a.row.projectId && a.row.projectId === order.openProject) ||
    recentRank(order, a.row.id) - recentRank(order, b.row.id) ||
    a.row.name.length - b.row.name.length ||
    a.row.name.localeCompare(b.row.name);

const hasRunWord = (query: FuzzyQuery): boolean => {
  const [first] = query.words;
  if (!first || query.words.length < 2) return false;
  const hit = fuzzyMatch({ words: [first], compact: first }, { name: RUN_WORDS });
  return !!hit && hit.score >= MIN_RUN_SCORE;
};

const asItem = ({ row, match }: Scored): ResultRow => ({
  id: row.id,
  kind: 'row',
  row,
  ranges: match.ranges,
});

const sectionOf = (
  group: CommandGroupId,
  scored: readonly Scored[],
  filter: CommandFilter | null,
): ResultSection => {
  const limit = filter ? FILTER_LIMIT : GROUP_LIMIT;
  const shown = scored.slice(0, limit).map(asItem);
  const rest = scored.length - shown.length;
  if (rest <= 0 || filter) {
    return { id: group, heading: groupTitle(group), items: shown, hidden: rest > 0 ? rest : 0 };
  }
  const more: ResultMore = {
    id: `more:${group}`,
    kind: 'more',
    count: rest,
    filter: GROUP_FILTER[group],
    sentence: t(messages.sayMore(groupTitle(group))),
  };
  return { id: group, heading: groupTitle(group), items: [...shown, more] };
};

const sectionsOf = (
  scored: readonly Scored[],
  filter: CommandFilter | null,
): ResultSection[] =>
  GROUP_ORDER.flatMap(group => {
    const rows = scored.filter(({ row }) => row.group === group);
    return rows.length > 0 ? [sectionOf(group, rows, filter)] : [];
  });

/** One row is apart from the others, and the fixed order of the groups would not show it first. */
const bestMatchOf = (scored: readonly Scored[]): Scored | null => {
  const actionable = scored
    .filter(({ row }) => row.verb !== undefined)
    .sort((a, b) => b.match.score - a.match.score);
  const [top, next] = actionable;
  if (!top || !next) return null;
  if (Math.floor(top.match.score / TIER) <= Math.floor(next.match.score / TIER)) return null;

  const first = GROUP_ORDER.flatMap(group => scored.filter(({ row }) => row.group === group))[0];
  return first === top ? null : top;
};

export const searchCommandRows = (
  rows: readonly CommandRow[],
  search: string,
  filter: CommandFilter | null,
  order: ResultOrder,
): CommandResults => {
  const query = prepareFuzzyQuery(search);
  const groups = filter && FILTER_GROUPS[filter];
  const runWord = hasRunWord(query);

  const scored = rows
    .filter(row => !groups || groups.includes(row.group))
    .filter(row => row.gate !== 'run' || runWord || row.here)
    .flatMap((row): Scored[] => {
      const match = fuzzyMatch(query, row.fields);
      return match ? [{ row, match }] : [];
    })
    .sort(compareScored(order));

  const best = filter ? null : bestMatchOf(scored);
  const sections = sectionsOf(best ? scored.filter(item => item !== best) : scored, filter);

  return {
    sections: best
      ? [{ id: 'best', heading: t(messages.groupBest), items: [asItem(best)] }, ...sections]
      : sections,
    total: scored.length,
    closeOnly: scored.length > 0 && scored.every(({ match }) => match.typo),
  };
};

const noMatch: FuzzyMatch = { score: 0, typo: false, ranges: [] };

/** A filter with no text lists its rows. */
export const browseCommandRows = (
  rows: readonly CommandRow[],
  filter: CommandFilter,
  order: ResultOrder,
): CommandResults => {
  const scored = rows
    .filter(row => FILTER_GROUPS[filter].includes(row.group) && (!row.gate || row.here))
    .map((row): Scored => ({ row, match: noMatch }))
    .sort(compareScored(order));
  return { sections: sectionsOf(scored, filter), total: scored.length, closeOnly: false };
};

/** The bar with no text: what the user took last, what acts on this page, the preferences. */
export const startCommandRows = (
  rows: readonly CommandRow[],
  order: ResultOrder,
): CommandResults => {
  const byId = new Map(rows.map(row => [row.id, row]));
  const taken = new Set<string>();
  const take = (list: readonly CommandRow[]): ResultRow[] =>
    list.flatMap(row => {
      if (taken.has(row.id)) return [];
      taken.add(row.id);
      return [{ id: row.id, kind: 'row', row, ranges: [] }];
    });

  const recent = take(
    order.recent
      .flatMap(id => byId.get(id) ?? [])
      .filter(row => row.verb !== undefined)
      .slice(0, RECENT_LIMIT),
  );
  const here = take(rows.filter(row => row.here).slice(0, HERE_LIMIT));
  const preferences = take(
    rows
      .filter(row => row.group === 'preferences')
      .sort((a, b) => Number(a.verb === undefined) - Number(b.verb === undefined)),
  );

  const sections: ResultSection[] = [
    { id: 'recent', heading: t(messages.groupRecent), items: recent },
    {
      id: 'here',
      heading: t(order.here === 'pipeline' ? messages.groupHerePipeline : messages.groupHereProject),
      items: here,
    },
    { id: 'preferences', heading: groupTitle('preferences'), items: preferences },
  ].filter(section => section.items.length > 0);

  return {
    sections,
    total: recent.length + here.length + preferences.length,
    closeOnly: false,
  };
};

export const commandResults = (
  rows: readonly CommandRow[],
  search: string,
  filter: CommandFilter | null,
  order: ResultOrder,
): CommandResults => {
  if (search.trim()) return searchCommandRows(rows, search, filter, order);
  return filter ? browseCommandRows(rows, filter, order) : startCommandRows(rows, order);
};

export const resultItems = (results: CommandResults): ResultItem[] =>
  results.sections.flatMap(section => section.items);

/** The first row that Enter can act on. */
export const firstActionable = (results: CommandResults): string =>
  resultItems(results).find(item => item.kind === 'more' || item.row.verb !== undefined)?.id ?? '';

export interface NamePart {
  text: string;
  hit: boolean;
}

export const nameParts = (name: string, ranges: readonly FuzzyRange[]): NamePart[] => {
  const source = name.normalize('NFC');
  const parts: NamePart[] = [];
  let at = 0;
  for (const [start, end] of ranges) {
    if (start > at) parts.push({ text: source.slice(at, start), hit: false });
    parts.push({ text: source.slice(start, end), hit: true });
    at = end;
  }
  if (at < source.length) parts.push({ text: source.slice(at), hit: false });
  return parts;
};
