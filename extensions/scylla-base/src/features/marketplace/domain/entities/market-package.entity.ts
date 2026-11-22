import type { FragmentVersion, MarketplaceCategory } from '@base/features/pipeline';

/** Who publishes a package: an organization of Scylla, by its handle. */
export interface Publisher {
  handle: string;
  /** Scylla checked who the organization is. */
  verified: boolean;
  /** Scylla itself: an official package. */
  official: boolean;
}

/** The languages and tools that a package is for: the filters of the marketplace. */
export const PACKAGE_STACKS = ['rust', 'node', 'go', 'python', 'docker'] as const;

export type PackageStack = (typeof PACKAGE_STACKS)[number];

/**
 * What a package needs besides its parameters: a tool on the agent, or a host that the agent
 * reaches. The secrets are parameters of the version.
 */
export type PackageRequirement =
  | { kind: 'agent'; tool: string }
  | { kind: 'network'; reaches: string };

/** A version of a package is a version of a fragment, as the library of its publisher holds it. */
export type PackageVersion = FragmentVersion;

/** A fragment that an organization shares in the marketplace. */
export interface MarketPackage {
  /** `publisher.name`, as in the address of its page. */
  id: string;
  name: string;
  description: string;
  publisher: Publisher;
  category: MarketplaceCategory;
  stacks: PackageStack[];
  tags: string[];
  /** The oldest first. The marketplace keeps the latest versions only. */
  versions: PackageVersion[];
  /** No new organization can add them. */
  deprecated: number[];
  requirements: PackageRequirement[];
  readme: string;
  stars: number;
  /** The reader starred it. */
  starred: boolean;
  createdAt: string;
}

export const latestPackageVersion = (pkg: Pick<MarketPackage, 'versions'>): PackageVersion =>
  pkg.versions[pkg.versions.length - 1];

/** The versions that an organization can still add, the latest first. */
export const addableVersions = (pkg: Pick<MarketPackage, 'versions' | 'deprecated'>) =>
  pkg.versions.filter(version => !pkg.deprecated.includes(version.number)).reverse();

/** The versions after `number`: a linked fragment gets them as upstream versions. */
export const versionsAfter = (pkg: Pick<MarketPackage, 'versions'>, number: number) =>
  pkg.versions.filter(version => version.number > number);

const NEW_FOR_DAYS = 14;

/** Shared for two weeks at most. */
export const isNewPackage = (pkg: Pick<MarketPackage, 'createdAt'>, now = Date.now()): boolean =>
  now - new Date(pkg.createdAt).getTime() < NEW_FOR_DAYS * 24 * 60 * 60 * 1000;
