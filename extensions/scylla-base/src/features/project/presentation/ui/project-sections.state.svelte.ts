import { createQueries, createQuery } from '@scylla/core-sdk';
import type { ProjectGroupEntity } from '@base/features/project/domain/entities/project-group.entity.ts';
import type { ProjectEntity } from '@base/features/project/domain/entities/project.entity.ts';
import {
  MAX_PINS,
  placeBefore,
  withoutPin,
  withPin,
} from '@base/features/project/domain/structs/project-layout.struct.ts';
import {
  countOfHealth,
  type ProjectCounts,
  type ProjectHealth,
  type ProjectSearchResult,
} from '@base/features/project/domain/structs/project-search.struct.ts';
import { projectGroupQueries } from '../project-group.queries.ts';
import { closedSections, projectPins } from '../project-layout.user-state.ts';
import { projectQueries } from '../project.queries.ts';
import { batchesOf, nextBatchSize, type PageOrder } from '../presenters/project-list.presenter.ts';
import {
  firstCardsOf,
  moreCardsOf,
  type ProjectDensity,
} from '../presenters/project-density.presenter.ts';
import {
  applyMoves,
  inGroupOrder,
  PINS,
  REORDER_LIMIT,
  searchSectionOf,
  UNGROUPED,
  type CardMove,
  type SectionKey,
} from '../presenters/project-sections.presenter.ts';

/** One section of the page, as the page shows it. */
export interface SectionView {
  key: SectionKey;
  /** The group of a group section. */
  group?: ProjectGroupEntity;
  /** The cards of the section, in their order. */
  projects: ProjectEntity[];
  /** The projects of the section with the health, on all the pages. */
  total: number;
  counts?: ProjectCounts;
  /** The cards that "Show more" adds; 0 when each card shows. */
  nextBatch: number;
  /** The first cards of the section load. */
  loading: boolean;
  busy: boolean;
  open: boolean;
}

interface SectionsOptions {
  workspaceId: () => string;
  order: () => PageOrder;
  health: () => ProjectHealth;
  phone: () => boolean;
  /** The drops of the reorder mode; `null` out of the mode. */
  moves: () => readonly CardMove[] | null;
  /** The order of the groups in the reorder mode; `null` out of the mode. */
  groupOrder?: () => readonly string[] | null;
  /** The density of a section: a denser section reads more cards in each batch. */
  density?: (key: SectionKey) => ProjectDensity;
}

type SearchResult = {
  data?: ProjectSearchResult;
  isPending: boolean;
  isFetching: boolean;
  isError: boolean;
  dataUpdatedAt: number;
};

/**
 * The sections of the projects page: the pins of the person, the groups of the workspace, then
 * the projects with no group. Each section reads its own first cards and has its own "Show more".
 * The pins and the closed sections are keys of the person.
 */
export const createProjectSections = (options: SectionsOptions) => {
  const workspaceId = $derived(options.workspaceId());
  const groups = createQuery(() => projectGroupQueries.list(workspaceId));
  let pins = $state(projectPins.read(options.workspaceId()));
  let closed = $state(closedSections.read(options.workspaceId()));
  // The sidebar folds the same sections and shows the same pins.
  $effect(() =>
    closedSections.onChange(() => {
      closed = closedSections.read(workspaceId);
    }),
  );
  $effect(() =>
    projectPins.onChange(() => {
      pins = projectPins.read(workspaceId);
    }),
  );

  const reordering = $derived(options.moves() !== null);
  const groupList = $derived(inGroupOrder(groups.data ?? [], options.groupOrder?.() ?? null));
  const densityOf = (key: SectionKey): ProjectDensity => options.density?.(key) ?? 'comfortable';
  const firstOf = (key: SectionKey) => firstCardsOf(densityOf(key), options.phone());
  const moreOf = (key: SectionKey) => moreCardsOf(densityOf(key));

  // "Show more" counts its clicks for each section, for one order and one health.
  const searchKey = $derived(`${options.order()}\n${options.health()}`);
  let clicks = $state<{ key: string; bySection: Record<SectionKey, number> }>({
    key: '',
    bySection: {},
  });
  const limitOf = (key: SectionKey) =>
    firstOf(key) + (clicks.key === searchKey ? (clicks.bySection[key] ?? 0) : 0) * moreOf(key);

  // The pins read no section: with no pin, the search would give each project.
  const readKeys = $derived<SectionKey[]>([
    ...(pins.length > 0 ? [PINS] : []),
    ...groupList.map(group => group.id),
    UNGROUPED,
  ]);
  // A closed section reads its first cards too: its line of chips shows them, and it opens at once.
  const results = createQueries(() => ({
    queries: groups.data
      ? readKeys.map(key => {
          const limit = reordering ? REORDER_LIMIT : key === PINS ? MAX_PINS : limitOf(key);
          return projectQueries.search({
            workspaceId,
            query: '',
            order: options.order(),
            health: options.health(),
            limit,
            // Sorted: a new order of the pins does not read them again.
            ...(key === PINS
              ? { projectIds: [...pins].sort() }
              : { section: searchSectionOf(key) }),
          });
        })
      : [],
  }));
  const all = $derived([...results] as SearchResult[]);
  // Each new read of a section is a new query with no data: the reorder mode reads all its cards,
  // "Show more" reads more, and « Done » reads the first cards again. The `placeholderData` of the
  // search keeps nothing across queries. Thus a section keeps its newest cards, for one order and
  // one health, while a read loads: the page shows no skeleton and no old order again.
  type Kept = { data: ProjectSearchResult; at: number };
  let kept: { scope: string; byKey: Partial<Record<SectionKey, Kept>> } = { scope: '', byKey: {} };
  const keptOf = (key: SectionKey, result: SearchResult | undefined): SearchResult | undefined => {
    const scope = `${workspaceId}\n${searchKey}`;
    if (kept.scope !== scope) kept = { scope, byKey: {} };
    const last = kept.byKey[key];
    if (!result || result.isError) return result;
    if (result.data && (!last || result.dataUpdatedAt >= last.at)) {
      kept.byKey[key] = { data: result.data, at: result.dataUpdatedAt };
    }
    // A read that loads again and has older cards than the kept ones does not show (« Done »).
    const old = result.isFetching && result.dataUpdatedAt < (last?.at ?? 0);
    if (!last || (result.data && !old)) return result;
    return {
      data: last.data,
      dataUpdatedAt: last.at,
      isPending: false,
      isFetching: result.isFetching,
      isError: false,
    };
  };
  const resultOf = $derived(
    Object.fromEntries(readKeys.map((key, index) => [key, keptOf(key, all[index])])),
  );

  const byId: Record<string, ProjectEntity> = $derived(
    Object.fromEntries(
      Object.values(resultOf)
        .flatMap(result => result?.data?.items ?? [])
        .map(item => [item.id, item]),
    ),
  );
  const loadedIds = (key: SectionKey) =>
    resultOf[key]?.data?.items.map(project => project.id) ?? [];
  // In the custom order, the pins keep the order of the person.
  const orders = $derived(
    applyMoves(
      Object.fromEntries(
        readKeys.map(key => [
          key,
          key === PINS && options.order() === 'position' ? pins : loadedIds(key),
        ]),
      ),
      options.moves() ?? [],
    ),
  );

  const viewOf = (key: SectionKey): SectionView => {
    const result = resultOf[key];
    const counts = result?.data?.counts;
    const ids = orders[key] ?? [];
    const loaded = ids.filter(id => id in byId);
    // Out of the mode, the kept cards of the mode do not show over the first cards.
    const shown = reordering ? loaded : loaded.slice(0, limitOf(key));
    const total =
      reordering || key === PINS
        ? loaded.length
        : counts
          ? countOfHealth(counts, options.health())
          : 0;
    return {
      key,
      group: groupList.find(group => group.id === key),
      projects: shown.map(id => byId[id]),
      total,
      counts,
      nextBatch:
        reordering || shown.length >= total
          ? 0
          : nextBatchSize(shown.length, total, moreOf(key)) || moreOf(key),
      // With no data yet, the section loads, unless the page has each of its cards: a new pin.
      loading: !!result && !result.data && (ids.length === 0 || loaded.length < ids.length),
      busy: !!result?.isFetching,
      open: !closed.includes(key),
    };
  };

  // With a health filter, a section with no card does not show.
  const sections = $derived(
    [
      ...(pins.length > 0 || reordering ? [PINS] : []),
      ...groupList.map(group => group.id),
      UNGROUPED,
    ]
      .map(viewOf)
      .filter(
        section => reordering || options.health() === 'all' || section.loading || section.total > 0,
      ),
  );
  const batchOf = $derived(
    Object.fromEntries(
      sections.flatMap(section =>
        batchesOf(
          section.projects.map(project => project.id),
          firstOf(section.key),
          moreOf(section.key),
        ).flatMap(batch => batch.map(id => [`${section.key}\n${id}`, batch] as const)),
      ),
    ),
  );

  const savePins = (next: string[]) => {
    pins = next;
    projectPins.save(workspaceId, next);
  };
  const saveClosed = (next: string[]) => {
    closed = next;
    closedSections.save(workspaceId, next);
  };

  return {
    /** The groups of the workspace, in the order of the page (of the reorder mode in it). */
    get groups() {
      return groupList;
    },
    /** The order of the groups on the server: « Done » compares the order of the page with it. */
    get savedGroupIds(): string[] {
      return (groups.data ?? []).map(group => group.id);
    },
    get sections() {
      return sections;
    },
    get pins(): readonly string[] {
      return pins;
    },
    /** The page shows its skeleton: the groups or the projects with no group load. */
    get loading() {
      return groups.isPending || !!resultOf[UNGROUPED]?.isPending;
    },
    /** No read gave data: the page shows the error. */
    get failed() {
      return (!groups.data && groups.isError) || all.some(result => !result.data && result.isError);
    },
    /** Each card of the page, once. */
    get projectIds() {
      const ids = sections.flatMap(section => section.projects.map(project => project.id));
      return ids.filter((id, index) => ids.indexOf(id) === index);
    },
    /** The cards of a section, in the order of the page: « Move up » and « Move down » use it. */
    idsOf(key: SectionKey): string[] {
      return sections.find(section => section.key === key)?.projects.map(p => p.id) ?? [];
    },
    /** The batch of a card: a part of the card reads the data of its whole batch in one call. */
    batchOf(key: SectionKey, projectId: string): readonly string[] {
      return batchOf[`${key}\n${projectId}`] ?? [projectId];
    },
    isPinned(projectId: string) {
      return pins.includes(projectId);
    },
    togglePin(projectId: string) {
      savePins(pins.includes(projectId) ? withoutPin(pins, projectId) : withPin(pins, projectId));
    },
    /** Puts a pin before another pin, or last. */
    placePin(projectId: string, beforeId?: string) {
      savePins(placeBefore(pins, projectId, beforeId));
    },
    setPins(next: readonly string[]) {
      savePins([...next]);
    },
    toggle(key: SectionKey) {
      saveClosed(closed.includes(key) ? closed.filter(other => other !== key) : [...closed, key]);
    },
    open(key: SectionKey) {
      if (closed.includes(key)) saveClosed(closed.filter(other => other !== key));
    },
    showMore(key: SectionKey) {
      const bySection = clicks.key === searchKey ? clicks.bySection : {};
      clicks = { key: searchKey, bySection: { ...bySection, [key]: (bySection[key] ?? 0) + 1 } };
    },
  };
};

export type ProjectSectionsState = ReturnType<typeof createProjectSections>;
