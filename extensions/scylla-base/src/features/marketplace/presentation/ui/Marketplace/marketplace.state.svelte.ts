import { createQuery } from '@scylla/core-sdk';
import { toRune } from '@scylla/ui/stores';
import { contextStore } from '@platform/context';
import { fragmentQueries, type MarketplaceCategory } from '@base/features/pipeline';
import type { PackageStack } from '@base/features/marketplace/domain/entities/market-package.entity.ts';
import { marketplaceQueries } from '@base/features/marketplace/presentation/marketplace.queries.ts';
import {
  facetCounts,
  filterPackages,
  isFiltered,
  NO_FILTER,
  toggled,
  type PackageFilter,
  type PackageOrder,
} from '@base/features/marketplace/presentation/presenters/package-filter.presenter.ts';
import {
  libraryStatus,
  type LibraryStatus,
} from '@base/features/marketplace/presentation/presenters/library-status.presenter.ts';

const context = toRune(contextStore);

/** The three views of the page: every package, those of the library, those of the workspace. */
export type MarketplaceTab = 'explore' | 'added' | 'published';

/**
 * The marketplace page: the packages of the marketplace, those of the workspace too, where each
 * one stands in the library, and the filters of the reader.
 */
export const createMarketplace = () => {
  const workspace = $derived(context().workspace);
  const packagesQuery = createQuery(() => marketplaceQueries.list());
  const fragmentsQuery = createQuery(() => fragmentQueries.list(workspace.id));

  const fragments = $derived(fragmentsQuery.data ?? []);
  const packages = $derived(packagesQuery.data ?? []);
  const statuses = $derived(
    Object.fromEntries(packages.map(pkg => [pkg.id, libraryStatus(pkg, fragments)])),
  );

  const kindOf = (id: string) => statuses[id]?.kind ?? 'none';
  const added = $derived(packages.filter(pkg => ['linked', 'forked'].includes(kindOf(pkg.id))));
  const published = $derived(packages.filter(pkg => kindOf(pkg.id) === 'own'));

  let tab = $state<MarketplaceTab>('explore');
  let filter = $state<PackageFilter>({ ...NO_FILTER });

  const inTab = $derived(tab === 'added' ? added : tab === 'published' ? published : packages);

  return {
    get isLoading() {
      return packagesQuery.isLoading || fragmentsQuery.isLoading;
    },
    get isError() {
      return packagesQuery.isError;
    },
    get workspaceName() {
      return workspace.name ?? '';
    },
    get tab() {
      return tab;
    },
    set tab(next: MarketplaceTab) {
      tab = next;
    },
    get counts() {
      return { added: added.length, published: published.length };
    },
    get filter() {
      return filter;
    },
    get hasPackages() {
      return packages.length > 0;
    },
    get isFiltered() {
      return isFiltered(filter);
    },
    get facets() {
      return facetCounts(inTab, filter);
    },
    get shown() {
      return filterPackages(inTab, filter);
    },
    statusOf(id: string): LibraryStatus {
      return statuses[id] ?? { kind: 'none' };
    },

    set query(next: string) {
      filter.query = next;
    },
    set order(next: PackageOrder) {
      filter.order = next;
    },
    set verifiedOnly(next: boolean) {
      filter.verifiedOnly = next;
    },
    set officialOnly(next: boolean) {
      filter.officialOnly = next;
    },
    toggleCategory(category: MarketplaceCategory) {
      filter.categories = toggled(filter.categories, category);
    },
    toggleStack(stack: PackageStack) {
      filter.stacks = toggled(filter.stacks, stack);
    },
    /** The order stays: it is not a filter. */
    clear() {
      filter = { ...NO_FILTER, order: filter.order };
    },
  };
};

export type Marketplace = ReturnType<typeof createMarketplace>;
