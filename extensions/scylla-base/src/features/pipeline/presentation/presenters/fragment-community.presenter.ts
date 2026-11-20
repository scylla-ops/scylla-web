import type { MessageDescriptor } from '@lingui/core';
import type {
  FragmentAuthor,
  FragmentEntity,
} from '@base/features/pipeline/domain/entities/fragment.entity.ts';
import { publicName } from '@base/features/pipeline/domain/structs/fragment-publication.struct.ts';
import type { PublicationCheck } from '@base/features/pipeline/domain/structs/publication-check.struct.ts';
import type { VersionChange } from '@base/features/pipeline/domain/structs/version-diff.struct.ts';
import { communityMessages } from '@base/features/pipeline/presentation/messages/community.messages.ts';

/** `@scylla/docker-buildx`: how the pages name a fragment of the marketplace. */
export const sourceReference = (fragment: Pick<FragmentEntity, 'source'>): string =>
  fragment.source
    ? publicName(fragment.source.package.publisher, fragment.source.package.name)
    : '';

export const versionChangeMessage = (change: VersionChange): MessageDescriptor => {
  switch (change.kind) {
    case 'node-added':
      return communityMessages.nodeAdded(change.id);
    case 'node-removed':
      return communityMessages.nodeRemoved(change.id);
    case 'node-changed':
      return communityMessages.nodeChanged(change.id);
    case 'parameter-added':
      return communityMessages.parameterAdded(change.parameter.key);
    case 'parameter-removed':
      return communityMessages.parameterRemoved(change.key);
    case 'default-changed':
      return communityMessages.defaultChanged(change.key, change.from, change.to);
  }
};

/** The sign before a change: `+` adds, `-` removes, `~` changes. */
export const versionChangeSign = (change: VersionChange): '+' | '-' | '~' => {
  if (change.kind === 'node-added' || change.kind === 'parameter-added') return '+';
  if (change.kind === 'node-removed' || change.kind === 'parameter-removed') return '-';
  return '~';
};

/** The line of a check, and what to do when it fails. `secrets`: the secret parameters. */
export const publicationCheckText = (
  check: PublicationCheck,
  workspace: string,
  secrets: string[],
): { title: MessageDescriptor; detail: MessageDescriptor | null } => {
  switch (check.kind) {
    case 'secret-defaults':
      return {
        title: communityMessages.checkSecretDefaults,
        detail: !check.passed
          ? communityMessages.checkSecretDefaultsFailed(check.keys.join(', '))
          : secrets.length
            ? communityMessages.checkSecretsRequired(secrets.join(', '))
            : null,
      };
    case 'documented':
      return {
        title: communityMessages.checkDocumented,
        detail: check.passed ? null : communityMessages.checkUndocumented(check.keys.join(', ')),
      };
    case 'private-defaults':
      return {
        title: communityMessages.checkPrivateDefaults,
        detail: check.passed
          ? null
          : communityMessages.checkPrivateDefaultsFailed(check.keys.join(', ')),
      };
    case 'workspace-references':
      return {
        title: communityMessages.checkReferences(workspace),
        detail: check.passed
          ? null
          : communityMessages.checkReferencesFailed(check.nodes.join(', ')),
      };
  }
};

/** One line of the versions of a fragment page. */
export interface VersionRow {
  number: number;
  author: FragmentAuthor;
  /** Unknown for the base of a fork. */
  publishedAt: string | null;
  changes: string[];
  /**
   * - `library`: a version of the library, linked by `pipelines` pipelines.
   * - `pending`: a version of the publisher, not accepted yet.
   * - `skipped`: a version of the publisher that the workspace did not take.
   * - `base`: the version of the publisher that a fork started from.
   */
  state: 'library' | 'pending' | 'skipped' | 'base';
  pipelines: number;
  /** Of a public fragment only. */
  visibility: 'public' | 'private' | 'deprecated' | null;
  latest: boolean;
}

/** The versions of the library with those of the publisher around them, the newest first. */
export const versionRows = (fragment: FragmentEntity): VersionRow[] => {
  const { source, publication } = fragment;
  const latest = fragment.versions.at(-1)?.number;
  const visibilityOf = (number: number): VersionRow['visibility'] => {
    if (!publication) return null;
    if (publication.deprecated.includes(number)) return 'deprecated';
    return publication.versions.includes(number) ? 'public' : 'private';
  };

  const library: VersionRow[] = fragment.versions.map(version => ({
    ...version,
    state: 'library',
    pipelines: fragment.usages.filter(usage => usage.version === version.number).length,
    visibility: visibilityOf(version.number),
    latest: version.number === latest,
  }));

  const upstream: VersionRow[] =
    source?.kind === 'linked'
      ? source.upstream.map(version => ({
          ...version,
          state: source.skipped.includes(version.number) ? 'skipped' : 'pending',
          pipelines: 0,
          visibility: null,
          latest: false,
        }))
      : [];

  const rows = [...library, ...upstream].sort((a, b) => b.number - a.number);
  if (source?.kind !== 'forked') return rows;

  // A fork numbers its own versions: the base of the publisher closes the list.
  const base: VersionRow = {
    number: source.baseVersion,
    author: { id: source.package.publisher, name: `@${source.package.publisher}` },
    publishedAt: null,
    changes: [],
    state: 'base',
    pipelines: 0,
    visibility: null,
    latest: false,
  };
  return [...rows, base];
};
