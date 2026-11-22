import type { FragmentEntity } from '@base/features/pipeline/domain/entities/fragment.entity.ts';

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

/** The licenses that a publisher picks from. */
export const PUBLICATION_LICENSES = ['MIT', 'Apache-2.0', 'BSD-3-Clause', 'MPL-2.0'] as const;
