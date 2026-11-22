import { latestVersion, type FragmentEntity } from '@base/features/pipeline';
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

export const libraryStatus = (
  pkg: Pick<MarketPackage, 'id'>,
  fragments: readonly FragmentEntity[],
): LibraryStatus => {
  const own = fragments.find(fragment => fragment.publication?.packageId === pkg.id);
  if (own) return { kind: 'own', fragment: own };

  const added = fragments.find(fragment => fragment.source?.package.packageId === pkg.id);
  if (added?.source?.kind === 'linked')
    return { kind: 'linked', fragment: added, version: latestVersion(added).number };
  if (added) return { kind: 'forked', fragment: added };
  return { kind: 'none' };
};

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
