import type { Package } from '@base/generated/scylla/marketplace/v1/package.ts';
import { categoryToDomain, versionFromContent } from '@base/features/pipeline';
import { idValue, timestampToIso } from '@shared/infrastructure/grpc/wrappers.ts';
import type { MarketPackage } from '../domain/entities/market-package.entity.ts';

/**
 * A package of the marketplace. A version with no content (a list gives the latest one only) is
 * left out. The marketplace has no stack, no requirement and no readme of its own yet.
 */
export const toDomain = (pkg: Package): MarketPackage => ({
  id: idValue(pkg.id),
  name: pkg.name,
  description: pkg.description,
  publisher: { handle: pkg.publisher, verified: pkg.verified, official: false },
  category: categoryToDomain(pkg.category),
  stacks: [],
  tags: pkg.tags,
  versions: pkg.versions
    .filter(version => version.content.length > 0)
    .map(version => versionFromContent(version.content, pkg.publisher)),
  deprecated: pkg.versions.filter(version => version.deprecated).map(version => version.number),
  requirements: [],
  readme: pkg.description,
  stars: pkg.stars,
  starred: pkg.starred,
  createdAt: timestampToIso(pkg.publishedAt),
});
