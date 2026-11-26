import { MediaQuery } from 'svelte/reactivity';
import { createQuery } from '@scylla/core-sdk';
import { createSearchParams } from '@platform/context';
import {
  countOfHealth,
  type ProjectHealth,
} from '@base/features/project/domain/structs/project-search.struct.ts';
import { projectQueries } from '../project.queries.ts';
import {
  batchesOf,
  DEFAULT_ORDER,
  FIRST_CARDS,
  MORE_CARDS,
  nextBatchSize,
  PHONE_FIRST_CARDS,
  healthOfParam,
  orderOfParam,
  type PageOrder,
} from '../presenters/project-list.presenter.ts';

/** The pause after the last typed letter, before the search goes to the server. */
export const SEARCH_DELAY_MS = 250;

/**
 * The state of the projects page. The search, the health and the order are in the URL: a copied
 * link or a reload opens the same list. A new search, health or order shows the first batch again.
 */
export const createProjectList = (workspaceId: () => string) => {
  const params = createSearchParams(['q', 'health', 'sort'] as const);
  // Below `md`: the toolbar of a phone, and three cards first.
  const phone = new MediaQuery('(max-width: 767px)');

  const query = $derived(params.values.q.trim());
  const health = $derived(healthOfParam(params.values.health));
  const order = $derived(orderOfParam(params.values.sort));

  // The field shows each letter at once; the URL and the server follow after a pause.
  let text = $state(params.values.q);
  let timer: ReturnType<typeof setTimeout> | undefined;

  // "Show more" counts its clicks for one search: another search starts with no click.
  const searchKey = $derived(`${query}\n${health}\n${order}`);
  let clicks = $state({ key: '', count: 0 });
  const moreClicks = $derived(clicks.key === searchKey ? clicks.count : 0);
  const first = $derived(phone.current ? PHONE_FIRST_CARDS : FIRST_CARDS);
  const limit = $derived(first + moreClicks * MORE_CARDS);

  // With no search, the sections of the page read the projects.
  const results = createQuery(() =>
    projectQueries.search({ workspaceId: workspaceId(), query, order, health, limit }, !!query),
  );
  // The header counts the whole workspace, also during a search.
  const whole = createQuery(() =>
    projectQueries.search({
      workspaceId: workspaceId(),
      query: '',
      order: DEFAULT_ORDER,
      health: 'all',
      limit: 1,
    }),
  );

  const items = $derived(results.data?.items ?? []);
  const total = $derived(results.data ? countOfHealth(results.data.counts, health) : 0);
  const batchOf = $derived(
    Object.fromEntries(
      batchesOf(
        items.map(project => project.id),
        first,
      ).flatMap(batch => batch.map(id => [id, batch] as const)),
    ),
  );

  return {
    results,
    get phone() {
      return phone.current;
    },
    get text() {
      return text;
    },
    get query() {
      return query;
    },
    get health() {
      return health;
    },
    get order() {
      return order;
    },
    get items() {
      return items;
    },
    /** The counts of the search: the health does not change them. */
    get counts() {
      return results.data?.counts;
    },
    /** The counts of the whole workspace, for the header. */
    get wholeCounts() {
      return whole.data?.counts;
    },
    /** The projects of the search and of the health, on all the pages. */
    get total() {
      return total;
    },
    /** The cards that "Show more" adds; 0 when each card shows. */
    get nextBatch() {
      return results.data?.hasMore ? nextBatchSize(items.length, total) || MORE_CARDS : 0;
    },
    /** The batch of a card: a part of the card reads the data of its whole batch in one call. */
    batchOf(projectId: string): readonly string[] {
      return batchOf[projectId] ?? [projectId];
    },
    type(value: string) {
      text = value;
      clearTimeout(timer);
      timer = setTimeout(() => params.write({ q: value }), SEARCH_DELAY_MS);
    },
    clearSearch() {
      text = '';
      clearTimeout(timer);
      params.write({ q: '' });
    },
    setHealth(next: ProjectHealth) {
      params.write({ health: next === 'all' ? '' : next });
    },
    setOrder(next: PageOrder) {
      params.write({ sort: next === DEFAULT_ORDER ? '' : next });
    },
    showMore() {
      clicks = { key: searchKey, count: moreClicks + 1 };
    },
  };
};

export type ProjectListState = ReturnType<typeof createProjectList>;
