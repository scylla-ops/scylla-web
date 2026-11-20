import { createQuery } from '@scylla/core-sdk';
import { toRune } from '@scylla/ui/stores';
import { contextStore } from '@platform/context';
import { fragmentQueries } from '@base/features/pipeline/presentation/fragment.queries.ts';
import {
  countInScope,
  filterFragments,
  libraryTags,
  sourceCounts,
  type FragmentOrder,
  type LibraryScope,
  type SourceFilter,
} from '@base/features/pipeline/presentation/presenters/fragment.presenter.ts';

const context = toRune(contextStore);

export type LibraryTab = Exclude<LibraryScope, 'all'>;

/**
 * The library page: the fragments of the workspace, or those of the marketplace (the community
 * tab), searched, narrowed by a tag or by their source, and sorted.
 */
export const createFragmentLibrary = () => {
  const workspace = $derived(context().workspace);
  const fragmentsQuery = createQuery(() => fragmentQueries.list(workspace.id));

  let query = $state('');
  let tab = $state<LibraryTab>('organization');
  let tag = $state<string | null>(null);
  let source = $state<SourceFilter>('all');
  let order = $state<FragmentOrder>('most-used');

  const fragments = $derived(fragmentsQuery.data ?? []);
  const tags = $derived(libraryTags(fragments));
  const shown = $derived(filterFragments(fragments, { query, scope: tab, tag, source, order }));
  const counts = $derived({
    organization: countInScope(fragments, 'organization'),
    community: countInScope(fragments, 'community'),
    ...sourceCounts(fragments),
  });

  return {
    get workspaceName() {
      return workspace.name ?? '';
    },
    get isLoading() {
      return fragmentsQuery.isLoading;
    },
    get isError() {
      return fragmentsQuery.isError;
    },
    /** The tab has no fragment at all, whatever the search. */
    get isEmpty() {
      return tab !== 'favorites' && counts[tab] === 0;
    },
    get counts() {
      return counts;
    },
    get tags() {
      return tags;
    },
    get shown() {
      return shown;
    },
    get query() {
      return query;
    },
    set query(next: string) {
      query = next;
    },
    get tab() {
      return tab;
    },
    set tab(next: LibraryTab) {
      tab = next;
      tag = null;
      source = 'all';
    },
    get tag() {
      return tag;
    },
    set tag(next: string | null) {
      tag = next;
    },
    get source() {
      return source;
    },
    set source(next: SourceFilter) {
      source = next;
    },
    get order() {
      return order;
    },
    set order(next: FragmentOrder) {
      order = next;
    },
  };
};

export type FragmentLibrary = ReturnType<typeof createFragmentLibrary>;
