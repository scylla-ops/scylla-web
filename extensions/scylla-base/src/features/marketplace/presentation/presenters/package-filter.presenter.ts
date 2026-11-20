import type { MarketplaceCategory } from '@base/features/pipeline';
import { matchesSearch } from '@scylla/ui/utils';
import {
  latestPackageVersion,
  type MarketPackage,
  type PackageStack,
} from '@base/features/marketplace/domain/entities/market-package.entity.ts';

export type PackageOrder = 'most-installed' | 'most-starred' | 'recent' | 'name';

export const PACKAGE_ORDERS: readonly PackageOrder[] = [
  'most-installed',
  'most-starred',
  'recent',
  'name',
];

export interface PackageFilter {
  query: string;
  verifiedOnly: boolean;
  officialOnly: boolean;
  /** Empty: every category. */
  categories: MarketplaceCategory[];
  /** Empty: every stack. */
  stacks: PackageStack[];
  order: PackageOrder;
}

export const NO_FILTER: PackageFilter = {
  query: '',
  verifiedOnly: false,
  officialOnly: false,
  categories: [],
  stacks: [],
  order: 'most-installed',
};

const updatedAt = (pkg: MarketPackage) => latestPackageVersion(pkg).publishedAt;

const COMPARE: Record<PackageOrder, (a: MarketPackage, b: MarketPackage) => number> = {
  'most-installed': (a, b) => b.installs - a.installs,
  'most-starred': (a, b) => b.stars - a.stars,
  recent: (a, b) => updatedAt(b).localeCompare(updatedAt(a)),
  name: (a, b) => a.name.localeCompare(b.name),
};

/** A search reads the name, the description, the publisher, the tags and the steps. */
const searchFields = (pkg: MarketPackage) => [
  pkg.name,
  pkg.description,
  pkg.publisher.handle,
  ...pkg.tags,
  ...latestPackageVersion(pkg).nodes.map(node => node.id),
];

/** The search and the publisher switches: the facets count what they keep. */
const inSearch = (pkg: MarketPackage, filter: PackageFilter): boolean =>
  (!filter.verifiedOnly || pkg.publisher.verified) &&
  (!filter.officialOnly || pkg.publisher.official) &&
  matchesSearch(filter.query, searchFields(pkg));

const inFacets = (pkg: MarketPackage, { categories, stacks }: PackageFilter): boolean =>
  (!categories.length || categories.includes(pkg.category)) &&
  (!stacks.length || stacks.some(stack => pkg.stacks.includes(stack)));

export const filterPackages = (
  packages: readonly MarketPackage[],
  filter: PackageFilter,
): MarketPackage[] =>
  packages
    .filter(pkg => inSearch(pkg, filter) && inFacets(pkg, filter))
    .sort(COMPARE[filter.order]);

/** Something narrows the list, besides its order. */
export const isFiltered = (filter: PackageFilter): boolean =>
  !!filter.query.trim() ||
  filter.verifiedOnly ||
  filter.officialOnly ||
  filter.categories.length > 0 ||
  filter.stacks.length > 0;

export interface FacetCounts {
  official: number;
  categories: Partial<Record<MarketplaceCategory, number>>;
  stacks: Partial<Record<PackageStack, number>>;
}

/** How many packages each checkbox of the sidebar would keep, within the search. */
export const facetCounts = (
  packages: readonly MarketPackage[],
  filter: PackageFilter,
): FacetCounts => {
  const searched = packages.filter(pkg => inSearch(pkg, { ...filter, officialOnly: false }));
  const counts: FacetCounts = {
    official: searched.filter(pkg => pkg.publisher.official).length,
    categories: {},
    stacks: {},
  };
  for (const pkg of searched) {
    counts.categories[pkg.category] = (counts.categories[pkg.category] ?? 0) + 1;
    for (const stack of pkg.stacks) counts.stacks[stack] = (counts.stacks[stack] ?? 0) + 1;
  }
  return counts;
};

/** One more value, or one less: the checkboxes of a facet. */
export const toggled = <Value>(values: readonly Value[], value: Value): Value[] =>
  values.includes(value) ? values.filter(other => other !== value) : [...values, value];
