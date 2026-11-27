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

/**
 * The five families of the chips. Each family holds some kinds of rows, and the results keep
 * their kinds apart with a header each.
 */
export type CommandFilter =
  | 'pages'
  | 'actions'
  | 'projects'
  | 'library'
  | 'team'
  /** `#`: the projects, the pipelines and the jobs together. No chip has this name. */
  | 'work';

const FILTER_GROUPS: Record<CommandFilter, readonly CommandGroupId[]> = {
  pages: ['pages', 'dashboards', 'preferences', 'workspaces'],
  actions: ['actions'],
  projects: ['projects', 'groups', 'pipelines', 'jobs', 'triggers'],
  /** The fragments of the library are parts of pipelines. */
  library: ['fragments', 'packages'],
  team: ['people', 'users', 'roles', 'machines', 'secrets'],
  work: ['projects', 'pipelines', 'jobs'],
};

/** The groups that a filter shows. */
export const filterGroups = (filter: CommandFilter): readonly CommandGroupId[] =>
  FILTER_GROUPS[filter];

const GROUP_FILTER: Record<CommandGroupId, CommandFilter> = {
  pages: 'pages',
  preferences: 'pages',
  dashboards: 'pages',
  workspaces: 'pages',
  actions: 'actions',
  projects: 'projects',
  groups: 'projects',
  pipelines: 'projects',
  jobs: 'projects',
  triggers: 'projects',
  fragments: 'library',
  packages: 'library',
  machines: 'team',
  people: 'team',
  roles: 'team',
  secrets: 'team',
  users: 'team',
};

/**
 * A group comes before the projects: the text of a group also finds its projects (by their place)
 * and its "New project in" action, and the group must stay in the first rows.
 */
const GROUP_ORDER: readonly CommandGroupId[] = [
  'pages',
  'preferences',
  'actions',
  'groups',
  'projects',
  'pipelines',
  'fragments',
  'jobs',
  'triggers',
  'dashboards',
  'machines',
  'people',
  'roles',
  'users',
  'secrets',
  'packages',
  'workspaces',
];

const GROUP_TITLES: Record<CommandGroupId, MessageDescriptor> = {
  pages: messages.groupPages,
  preferences: messages.groupPreferences,
  actions: messages.groupActions,
  projects: messages.groupProjects,
  groups: messages.groupGroups,
  pipelines: messages.groupPipelines,
  fragments: messages.groupFragments,
  dashboards: messages.groupDashboards,
  machines: messages.groupMachines,
  people: messages.groupPeople,
  roles: messages.groupRoles,
  secrets: messages.groupSecrets,
  workspaces: messages.groupWorkspaces,
  jobs: messages.groupJobs,
  triggers: messages.groupTriggers,
  users: messages.groupUsers,
  packages: messages.groupPackages,
};

const PREFIXES: Readonly<Record<string, CommandFilter>> = {
  '>': 'actions',
  '/': 'pages',
  '#': 'work',
  '@': 'team',
};

const RUN_WORDS = prepareFuzzyText('run start launch execute lancer executer demarrer');
const MIN_RUN_SCORE = 500;

const GROUP_LIMIT = 4;
const FILTER_LIMIT = 200;
const RECENT_LIMIT = 5;
const HERE_LIMIT = 6;
const PAGES_LIMIT = 4;
/** The row of the release notes: it shows with no text, so that a user finds it. */
const WHATS_NEW_ID = 'command:shell.whats-new';

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

/** The chips, in order. */
const FAMILIES: readonly { filter: CommandFilter; title: MessageDescriptor }[] = [
  { filter: 'pages', title: messages.groupPages },
  { filter: 'actions', title: messages.groupActions },
  { filter: 'projects', title: messages.groupProjects },
  { filter: 'library', title: messages.chipLibrary },
  { filter: 'team', title: messages.chipTeam },
];

export interface ChipSearch {
  /** The text of the search, with no filter prefix. */
  search: string;
  /** The filter in use: its chip stays, also with no result. */
  active: CommandFilter | null;
  order: ResultOrder;
  /** The kinds that wait for the server: their family stays until the answer. */
  searching?: readonly CommandGroupId[];
}

/**
 * A chip shows only when it has rows, or when the reader can search its kind on the server
 * (`available`): those rows come only with a text. With a text, a family with no result hides,
 * except the family in use and a family that waits for the server.
 */
export const commandChips = (
  rows: readonly CommandRow[],
  available: readonly CommandGroupId[] = [],
  typed?: ChipSearch,
): CommandChip[] => {
  const present = new Set([...rows.filter(row => !row.gate).map(row => row.group), ...available]);
  const found = (filter: CommandFilter): boolean => {
    if (!typed?.search.trim()) return true;
    if (chipPressed(filter, typed.active)) return true;
    if (typed.searching?.some(group => FILTER_GROUPS[filter].includes(group))) return true;
    return searchCommandRows(rows, typed.search, filter, typed.order).total > 0;
  };
  return [
    { filter: null, title: t(messages.chipAll) },
    ...FAMILIES.flatMap(({ filter, title }): CommandChip[] =>
      FILTER_GROUPS[filter].some(group => present.has(group)) && found(filter)
        ? [{ filter, title: t(title) }]
        : [],
    ),
  ];
};

export const chipPressed = (chip: CommandFilter | null, active: CommandFilter | null): boolean =>
  active === 'work'
    ? chip === 'projects'
    : chip === active;

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
  /** The server search of this kind runs: the section shows a small line under its rows. */
  searching?: boolean;
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
  /** The recent rows that no live list gives: the rows of the server search. */
  recentRows?: readonly CommandRow[];
  /** The kinds that the server searches now. */
  searching?: readonly CommandGroupId[];
}

interface Scored {
  row: CommandRow;
  match: FuzzyMatch;
}

const noMatch: FuzzyMatch = { score: 0, typo: false, ranges: [] };

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
    (a.row.rank ?? 0) - (b.row.rank ?? 0) ||
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

/** An action on a row comes just after that row, when the row shows. */
const withFollowers = (scored: readonly Scored[]): Scored[] => {
  const ids = new Set(scored.map(({ row }) => row.id));
  return scored
    .filter(({ row }) => !row.follows || !ids.has(row.follows))
    .flatMap(item => [item, ...scored.filter(({ row }) => row.follows === item.row.id)]);
};

/** A kind that the server searches shows its section, also before its first rows come. */
const sectionsOf = (
  scored: readonly Scored[],
  filter: CommandFilter | null,
  searching: readonly CommandGroupId[] = [],
): ResultSection[] =>
  GROUP_ORDER.flatMap(group => {
    const rows = withFollowers(scored.filter(({ row }) => row.group === group));
    const busy = searching.includes(group) && (!filter || FILTER_GROUPS[filter].includes(group));
    if (rows.length === 0) {
      return busy ? [{ id: group, heading: groupTitle(group), items: [], searching: true }] : [];
    }
    const section = sectionOf(group, rows, filter);
    return [busy ? { ...section, searching: true } : section];
  });

/** One row is apart from the others, and the fixed order of the groups would not show it first. */
const bestMatchOf = (scored: readonly Scored[]): Scored | null => {
  const actionable = scored
    .filter(({ row }) => row.verb !== undefined && !row.follows)
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

  const kept = rows
    .filter(row => (groups ? groups.includes(row.group) : !row.chipOnly))
    .filter(row => row.gate !== 'run' || runWord || row.here);
  const matched = kept.flatMap((row): Scored[] => {
    const match = fuzzyMatch(query, row.fields) ?? (row.found ? noMatch : null);
    return match ? [{ row, match }] : [];
  });
  // A pinned row follows the results of its group, e.g. the list of all the workspaces.
  const hit = new Set(matched.map(({ row }) => row.group));
  const pinned = kept
    .filter(row => row.pinned && hit.has(row.group) && !matched.some(item => item.row === row))
    .map((row): Scored => ({ row, match: noMatch }));
  const scored = [...matched, ...pinned].sort(compareScored(order));

  const best = filter ? null : bestMatchOf(scored);
  const rest = best ? scored.filter(item => item !== best) : scored;
  const sections = sectionsOf(rest, filter, order.searching);

  return {
    sections: best
      ? [{ id: 'best', heading: t(messages.groupBest), items: [asItem(best)] }, ...sections]
      : sections,
    total: scored.length,
    closeOnly: scored.length > 0 && scored.every(({ match }) => match.typo),
  };
};

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
  return {
    sections: sectionsOf(scored, filter, order.searching),
    total: scored.length,
    closeOnly: false,
  };
};

/** The bar with no text: what the user took last, what acts on this page, the preferences, the help. */
export const startCommandRows = (
  rows: readonly CommandRow[],
  order: ResultOrder,
): CommandResults => {
  const shown = rows.filter(row => !row.chipOnly);
  const byId = new Map([...(order.recentRows ?? []), ...shown].map(row => [row.id, row]));
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
      .filter(row => row.verb !== undefined && row.group !== 'preferences')
      .slice(0, RECENT_LIMIT),
  );
  const here = take(rows.filter(row => row.here).slice(0, HERE_LIMIT));
  // Enter on the first row must never change a setting: a page comes before the preferences.
  const pages = take(
    rows.filter(row => row.group === 'pages' && row.verb !== undefined).slice(0, PAGES_LIMIT),
  );
  const preferences = take(
    rows
      .filter(row => row.group === 'preferences')
      .sort((a, b) => Number(a.verb === undefined) - Number(b.verb === undefined)),
  );
  const help = take(rows.filter(row => row.id === WHATS_NEW_ID && row.verb !== undefined));

  const sections: ResultSection[] = [
    { id: 'recent', heading: t(messages.groupRecent), items: recent },
    {
      id: 'here',
      heading: t(
        order.here === 'pipeline' ? messages.groupHerePipeline : messages.groupHereProject,
      ),
      items: here,
    },
    { id: 'pages', heading: groupTitle('pages'), items: pages },
    { id: 'preferences', heading: groupTitle('preferences'), items: preferences },
    { id: 'help', heading: t(messages.groupHelp), items: help },
  ].filter(section => section.items.length > 0);

  return {
    sections,
    total: recent.length + here.length + pages.length + preferences.length + help.length,
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
