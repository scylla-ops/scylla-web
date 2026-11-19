import { createQuery } from '@scylla/core-sdk';
import { toRune } from '@scylla/ui/stores';
import { contextStore } from '@platform/context';
import { fragmentQueries } from '@base/features/pipeline/presentation/fragment.queries.ts';
import {
  filterFragments,
  libraryTags,
  type FragmentOrder,
} from '@base/features/pipeline/presentation/presenters/fragment.presenter.ts';

const context = toRune(contextStore);

/** The community shares fragments between organizations: it comes later, its tab is disabled. */
export type LibraryTab = 'organization' | 'favorites';

/** The library page: the fragments of the workspace, searched, filtered by a tag, and sorted. */
export const createFragmentLibrary = () => {
  const workspace = $derived(context().workspace);
  const fragmentsQuery = createQuery(() => fragmentQueries.list(workspace.id));

  let query = $state('');
  let tab = $state<LibraryTab>('organization');
  let tag = $state<string | null>(null);
  let order = $state<FragmentOrder>('most-used');

  const fragments = $derived(fragmentsQuery.data ?? []);
  const tags = $derived(libraryTags(fragments));
  const shown = $derived(
    filterFragments(fragments, { query, tag, favoritesOnly: tab === 'favorites', order }),
  );

  return {
    get workspaceId() {
      return workspace.id;
    },
    get workspaceName() {
      return workspace.name ?? '';
    },
    get isLoading() {
      return fragmentsQuery.isLoading;
    },
    get isError() {
      return fragmentsQuery.isError;
    },
    get isEmpty() {
      return fragments.length === 0;
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
    },
    get tag() {
      return tag;
    },
    set tag(next: string | null) {
      tag = next;
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
