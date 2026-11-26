import { createQuery } from '@scylla/core-sdk';
import type { PaginationInfo } from '@scylla/ui/structs';
import type {
  WorkspaceOrder,
  WorkspaceSearch,
} from '@base/features/workspace/domain/entities/workspace.entity.ts';
import { workspaceQueries } from '@base/features/workspace/presentation/workspace.queries.ts';
import { SEARCH_DELAY_MS } from '@base/features/workspace/presentation/presenters/workspace-owner.presenter.ts';

export const ADMIN_PAGE_SIZE = 20;

/**
 * The list of all the workspaces: the search, the order and the pages. The server gives a token
 * for the next page, so the state keeps the token of each page that the user opened: the previous
 * page reads the token before the last.
 */
export const createWorkspaceAdmin = (initialQuery: string) => {
  let query = $state(initialQuery);
  let searched = $state(initialQuery.trim());
  let order = $state<WorkspaceOrder>('name');
  let tokens = $state<string[]>(['']);

  // A new search or a new order starts again at the first page.
  $effect(() => {
    const next = query.trim();
    if (next === searched) return;
    const timer = setTimeout(() => {
      searched = next;
      tokens = [''];
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  });

  const search = $derived<WorkspaceSearch>({
    query: searched,
    order,
    othersOnly: false,
    pageSize: ADMIN_PAGE_SIZE,
    pageToken: tokens[tokens.length - 1] ?? '',
  });
  const list = createQuery(() => workspaceQueries.all(search));

  const total = $derived(list.data?.total ?? 0);
  const pagination = $derived<PaginationInfo>({
    page: tokens.length,
    pageSize: ADMIN_PAGE_SIZE,
    totalCount: total,
    totalPages: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)),
    hasNext: !!list.data?.nextToken,
    hasPrevious: tokens.length > 1,
  });

  return {
    list,
    get query() {
      return query;
    },
    set query(next: string) {
      query = next;
    },
    get order() {
      return order;
    },
    set order(next: WorkspaceOrder) {
      order = next;
      tokens = [''];
    },
    get pagination() {
      return pagination;
    },
    /** The pagination moves one page at a time. */
    goTo(page: number) {
      const nextToken = list.data?.nextToken;
      if (page > tokens.length && nextToken) tokens = [...tokens, nextToken];
      else if (page < tokens.length) tokens = tokens.slice(0, -1);
    },
  };
};
