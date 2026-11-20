import {
  latestVersion,
  marketplacePackageId,
  type FragmentEntity,
} from '@base/features/pipeline';
import {
  isNewPackage,
  latestPackageVersion,
  type MarketPackage,
} from '@base/features/marketplace/domain/entities/market-package.entity.ts';

/**
 * Where a package stands in the library of the workspace:
 * - `linked`: a linked fragment, on its `version`.
 * - `forked`: a fork that the workspace owns.
 * - `own`: the workspace publishes it.
 */
export type LibraryStatus =
  | { kind: 'none' }
  | { kind: 'linked'; fragment: FragmentEntity; version: number }
  | { kind: 'forked'; fragment: FragmentEntity }
  | { kind: 'own'; fragment: FragmentEntity };

/** `scope`: the slug of the workspace, the publisher of its own packages. */
export const libraryStatus = (
  pkg: Pick<MarketPackage, 'id'>,
  fragments: readonly FragmentEntity[],
  scope: string,
): LibraryStatus => {
  const own = fragments.find(
    fragment =>
      fragment.publication && marketplacePackageId(scope, fragment.publication.name) === pkg.id,
  );
  if (own) return { kind: 'own', fragment: own };

  const added = fragments.find(fragment => fragment.source?.package.packageId === pkg.id);
  if (added?.source?.kind === 'linked')
    return { kind: 'linked', fragment: added, version: latestVersion(added).number };
  if (added) return { kind: 'forked', fragment: added };
  return { kind: 'none' };
};

/**
 * The fragments that the workspace made public, as the marketplace shows them. The server will
 * list them with the others; in the browser, the library holds them.
 */
export const ownPackages = (fragments: readonly FragmentEntity[], scope: string): MarketPackage[] =>
  fragments.flatMap(fragment => {
    const { publication } = fragment;
    if (!publication) return [];
    const versions = fragment.versions
      .filter(version => publication.versions.includes(version.number))
      .map(version => ({ ...version, installs: 0 }));
    return [
      {
        id: marketplacePackageId(scope, publication.name),
        name: publication.name,
        description: fragment.description,
        publisher: { handle: scope, verified: false, official: false },
        category: publication.category,
        stacks: [],
        tags: fragment.tags,
        versions,
        deprecated: publication.deprecated,
        requirements: [],
        readme: fragment.description,
        installs: publication.stats.installs,
        stars: publication.stats.stars,
        starred: false,
        createdAt: publication.publishedAt,
      },
    ];
  });

/** What the corner of a card says, before its date. */
export type CardBadge =
  | { kind: 'in-library'; version: number | null }
  | { kind: 'official' }
  | { kind: 'own' }
  | { kind: 'new' }
  | null;

export const cardBadge = (pkg: MarketPackage, status: LibraryStatus, now = Date.now()): CardBadge => {
  if (status.kind === 'own') return { kind: 'own' };
  // A linked fragment behind the publisher tells its version: an update waits.
  if (status.kind === 'linked')
    return {
      kind: 'in-library',
      version: status.version < latestPackageVersion(pkg).number ? status.version : null,
    };
  if (status.kind === 'forked') return { kind: 'in-library', version: null };
  if (pkg.publisher.official) return { kind: 'official' };
  if (isNewPackage(pkg, now)) return { kind: 'new' };
  return null;
};
