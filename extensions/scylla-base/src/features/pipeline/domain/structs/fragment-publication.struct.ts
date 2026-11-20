import type {
  FragmentEntity,
  FragmentPublication,
  PublishToMarketplaceInput,
} from '@base/features/pipeline/domain/entities/fragment.entity.ts';

/** The public name: the slug of the workspace scopes the name of the fragment. */
export const publicName = (scope: string, name: string): string => `@${scope}/${name}`;

/**
 * Only the author and the admins make a fragment public, as for a new version. A linked fragment
 * belongs to its publisher; a fork can go public, under the name of the workspace.
 */
export const canPublishToMarketplace = (
  fragment: Pick<FragmentEntity, 'author' | 'source'>,
  person: { id: string; admin: boolean },
): boolean =>
  fragment.source?.kind !== 'linked' && (person.admin || fragment.author.id === person.id);

/** The first publication, or one more public version. The public name never changes. */
export const withPublication = (
  current: FragmentPublication | undefined,
  name: string,
  input: Omit<PublishToMarketplaceInput, 'id' | 'scope'>,
  now: string,
): FragmentPublication => ({
  name: current?.name ?? name,
  license: input.license,
  category: input.category,
  versions: [...new Set([...(current?.versions ?? []), input.version])].sort((a, b) => a - b),
  autoPublish: input.autoPublish,
  deprecated: current?.deprecated ?? [],
  publishedAt: current?.publishedAt ?? now,
  publishedBy: current?.publishedBy ?? input.author,
  stats: current?.stats ?? { installs: 0, organizations: 0, stars: 0, forks: 0, adoption: [] },
});

/** With `autoPublish`, a new version of the library goes public with it. */
export const withNewVersion = (
  publication: FragmentPublication | undefined,
  number: number,
): FragmentPublication | undefined =>
  publication?.autoPublish
    ? { ...publication, versions: [...publication.versions, number] }
    : publication;

/** Organizations that use the version keep it; no new one can add it. */
export const withDeprecated = (
  publication: FragmentPublication,
  number: number,
): FragmentPublication => ({
  ...publication,
  deprecated: [...new Set([...publication.deprecated, number])],
});

/** The licenses that a publisher picks from. */
export const PUBLICATION_LICENSES = ['MIT', 'Apache-2.0', 'BSD-3-Clause', 'MPL-2.0'] as const;

/** The shelves of the marketplace: a public fragment sits on one. */
export const MARKETPLACE_CATEGORIES = [
  'build',
  'test',
  'security',
  'deploy',
  'release',
  'quality',
] as const;

export type MarketplaceCategory = (typeof MARKETPLACE_CATEGORIES)[number];
